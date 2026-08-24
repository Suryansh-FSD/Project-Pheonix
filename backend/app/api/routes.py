from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, List, Optional

import numpy as np
import rasterio
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.schemas import (
    CacheMetadata,
    ChangeDetectionRequest,
    ChangeDetectionResponse,
    DownloadLinks,
    ErrorDetail,
    ErrorCode,
    ExecutionMode,
    HealthResponse,
    JobCreateResponse,
    JobDetailResponse,
    JobStatus,
    MetricEntry,
    RasterMetadata,
    PreviewURLs,
    SampleSummary,
    SourceType,
    ValidationMetrics,
    VegetationAnalysisResponse,
)
from app.jobs.manager import job_manager
from app.model.adapter import model_adapter
from app.model.provenance import load_model_provenance
from app.processing.raster import (
    BAND_ORDER,
    INPUT_HEIGHT,
    INPUT_PIXEL_SIZE_M,
    INPUT_WIDTH,
    OUTPUT_PIXEL_SIZE_M,
    SCALE_FACTOR,
    RasterValidationError,
    calculate_ndvi,
    generate_change_preview,
    generate_ndvi_preview,
    process_live_geotiff,
    validate_input,
)

logger = logging.getLogger("geosr.api")
router = APIRouter(prefix="/api")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB chunk for streaming
SAMPLES_METADATA_FILE = Path("data/demo/metadata.json")
CHANGE_PREVIEW_REGEX = re.compile(r"^change_[0-9a-f]{8}\.png$")


def _run_inference_sync(
    input_tif: Path,
    enhanced_tif: Path,
    lr_png: Path,
    sr_png: Path,
    lr_ndvi_png: Path,
    sr_ndvi_png: Path,
    lr_fc_png: Path,
    sr_fc_png: Path,
) -> dict[str, Any]:
    """Blocking CPU processing function called inside asyncio.to_thread."""
    if not model_adapter.is_ready():
        model_adapter.load_model()
    return process_live_geotiff(
        input_path=input_tif,
        output_geotiff_path=enhanced_tif,
        lr_preview_path=lr_png,
        sr_preview_path=sr_png,
        adapter=model_adapter,
        lr_ndvi_path=lr_ndvi_png,
        sr_ndvi_path=sr_ndvi_png,
        lr_fc_path=lr_fc_png,
        sr_fc_path=sr_fc_png,
    )


async def _run_live_inference_pipeline(job_id: str, input_tif: Path):
    """
    Background worker that runs genuine SEN2SRLite model inference in a separate thread.
    """
    async with job_manager.lock:
        start_time = time.time()
        job_manager.start_job(job_id)

        try:
            job_dir = job_manager.get_job_dir(job_id)
            enhanced_tif = job_dir / "enhanced_2_5m.tif"
            lr_png = job_dir / "lr_rgb.png"
            sr_png = job_dir / "sr_rgb.png"
            lr_ndvi_png = job_dir / "lr_ndvi.png"
            sr_ndvi_png = job_dir / "sr_ndvi.png"
            lr_fc_png = job_dir / "lr_fc.png"
            sr_fc_png = job_dir / "sr_fc.png"

            job_manager.update_job_progress(job_id, 40, "Running SEN2SRLite 4x Inference")

            res = await asyncio.to_thread(
                _run_inference_sync,
                input_tif,
                enhanced_tif,
                lr_png,
                sr_png,
                lr_ndvi_png,
                sr_ndvi_png,
                lr_fc_png,
                sr_fc_png,
            )

            job_manager.update_job_progress(job_id, 90, "Finalizing Output Rasters")

            duration = time.time() - start_time
            job_manager.complete_job(
                job_id=job_id,
                duration_s=duration,
                device=str(model_adapter.device),
                metadata=RasterMetadata(
                    crs=res["crs"],
                    input_shape=res["input_shape"],
                    output_shape=res["output_shape"],
                    input_pixel_size_m=res["input_pixel_size_m"],
                    output_pixel_size_m=res["output_pixel_size_m"],
                    bounds=res["bounds"],
                ),
                previews=PreviewURLs(
                    lr_rgb_url=f"/api/jobs/{job_id}/previews/lr_rgb.png",
                    sr_rgb_url=f"/api/jobs/{job_id}/previews/sr_rgb.png",
                    lr_ndvi_url=f"/api/jobs/{job_id}/previews/lr_ndvi.png",
                    sr_ndvi_url=f"/api/jobs/{job_id}/previews/sr_ndvi.png",
                    lr_fc_url=f"/api/jobs/{job_id}/previews/lr_fc.png",
                    sr_fc_url=f"/api/jobs/{job_id}/previews/sr_fc.png",
                ),
                metrics=ValidationMetrics(
                    psnr=MetricEntry(
                        value=None,
                        reference_available=False,
                        label="PSNR",
                        unit="dB",
                        description="Peak Signal-to-Noise Ratio calculated against aligned high-resolution reference.",
                    ),
                    ssim=MetricEntry(
                        value=None,
                        reference_available=False,
                        label="SSIM",
                        unit="",
                        description="Structural Similarity Index calculated against aligned high-resolution reference.",
                    ),
                    reconstruction_consistency=MetricEntry(
                        value=None,
                        reference_available=False,
                        label="Reconstruction Consistency",
                        unit="",
                        description="Correlation of downsampled 2.5m SR output to 10m LR grid (diagnostic only).",
                    ),
                ),
                downloads=DownloadLinks(
                    geotiff_url=f"/api/download/{job_id}/geotiff",
                    report_url=None,
                ),
            )
        except Exception:
            logger.exception("Inference failed for job %s", job_id)
            job_manager.fail_job(
                job_id,
                ErrorDetail(
                    code=ErrorCode.INFERENCE_FAILED,
                    message="Live inference execution failed during model processing.",
                    suggested_action="Ensure the input file is a valid 4-band GeoTIFF with surface reflectance within 0..10000.",
                ),
            )


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Service health and model readiness probe."""
    is_ready = model_adapter.is_ready()
    return HealthResponse(
        status="ok",
        backend_ready=True,
        model_ready=is_ready,
        model_provenance=load_model_provenance(),
        device=str(model_adapter.device) if is_ready else "unavailable",
        version="1.0.0",
    )


@router.get("/samples", response_model=List[SampleSummary])
def list_samples() -> List[SampleSummary]:
    """List bundled samples if verified; otherwise return empty list for upload-only MVP."""
    if not SAMPLES_METADATA_FILE.exists():
        return []
    try:
        with open(SAMPLES_METADATA_FILE, "r") as f:
            data = json.load(f)
            samples = data.get("samples", [])
            return [
                SampleSummary.model_validate(s)
                for s in samples
                if s.get("license_info", {}).get("redistribution_permitted", False)
            ]
    except Exception:
        return []


@router.post("/enhance", response_model=JobCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_enhancement_job(
    background_tasks: BackgroundTasks,
    execution_mode: ExecutionMode = Form(...),
    sample_id: Optional[str] = Form(None),
    band_order: str = Form("B04,B03,B02,B08"),
    file: Optional[UploadFile] = File(None),
) -> JobCreateResponse:
    """
    Create a new super-resolution enhancement job.
    Upload-only live inference is the primary active mode.
    """
    if file is not None and sample_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.INVALID_REQUEST.value,
                "message": "Cannot provide both 'file' and 'sample_id'. Upload a Sentinel-2 GeoTIFF.",
                "suggested_action": "Submit an uploaded GeoTIFF for live 4x enhancement.",
            },
        )

    if execution_mode == ExecutionMode.CACHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.CACHE_NOT_AVAILABLE.value,
                "message": "Cached demonstration mode is disabled pending lawful dataset redistribution verification.",
                "suggested_action": "Use execution_mode='live' with a 4-band 128x128 GeoTIFF upload.",
            },
        )

    if band_order != "B04,B03,B02,B08":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.INVALID_BANDS.value,
                "message": f"Unsupported band order: {band_order}. Expected B04,B03,B02,B08.",
                "suggested_action": "Provide input bands in B04 (Red), B03 (Green), B02 (Blue), B08 (NIR) order.",
            },
        )

    if execution_mode == ExecutionMode.LIVE:
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_REQUEST.value,
                    "message": "A four-band GeoTIFF file upload is required for live 4x super-resolution.",
                    "suggested_action": "Upload a 4-band (B04, B03, B02, B08) 128x128 GeoTIFF.",
                },
            )

        create_response = job_manager.create_job(
            execution_mode=ExecutionMode.LIVE,
            source_type=SourceType.UPLOAD,
            sample_id=None,
        )
        job_dir = job_manager.get_job_dir(create_response.job_id)
        input_tif = job_dir / "input.tif"

        total_bytes = 0
        try:
            with open(input_tif, "wb") as out_f:
                while chunk := await file.read(CHUNK_SIZE):
                    total_bytes += len(chunk)
                    if total_bytes > MAX_UPLOAD_BYTES:
                        job_manager.cancel_and_cleanup_job(create_response.job_id)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail={
                                "code": ErrorCode.INPUT_TOO_LARGE.value,
                                "message": f"File size exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
                                "suggested_action": "Provide a smaller patch (128x128 pixels).",
                            },
                        )
                    out_f.write(chunk)
        except HTTPException:
            job_manager.cancel_and_cleanup_job(create_response.job_id)
            raise

        try:
            validate_input(input_tif)
        except RasterValidationError as rve:
            job_manager.cancel_and_cleanup_job(create_response.job_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": rve.code.value,
                    "message": rve.message,
                    "suggested_action": "Ensure the file is a 4-band 128x128 GeoTIFF with projected CRS and 10m pixel size.",
                },
            )
        except Exception:
            logger.exception("Could not parse uploaded GeoTIFF")
            job_manager.cancel_and_cleanup_job(create_response.job_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_FILE.value,
                    "message": "Could not parse uploaded GeoTIFF: file structure is corrupt or unsupported.",
                    "suggested_action": "Ensure the uploaded file is a valid georeferenced GeoTIFF.",
                },
            )

        background_tasks.add_task(_run_live_inference_pipeline, create_response.job_id, input_tif)
        return create_response


@router.get("/jobs/{job_id}", response_model=JobDetailResponse)
def get_job_status(job_id: str) -> JobDetailResponse:
    """Read the status, progress, metrics, and downloads for a given job."""
    if not job_manager.is_valid_job_id(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": ErrorCode.INVALID_REQUEST.value,
                "message": f"Invalid job ID format: '{job_id}'.",
                "suggested_action": "Provide a valid UUID job ID.",
            },
        )
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": ErrorCode.INVALID_REQUEST.value,
                "message": f"Job '{job_id}' not found.",
                "suggested_action": "Verify the job_id and try again.",
            },
        )
    return job


@router.get("/jobs/{job_id}/analysis/vegetation", response_model=VegetationAnalysisResponse)
def get_vegetation_analysis(job_id: str) -> VegetationAnalysisResponse:
    """
    Calculate NDVI analytical metrics strictly on the enhanced raw GeoTIFF surface reflectance.
    Applies raster dataset mask and strictly excludes invalid/nodata pixels.
    """
    if not job_manager.is_valid_job_id(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid job ID format."},
        )
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Job '{job_id}' not found."},
        )
    if job.status != JobStatus.COMPLETED and job.status != JobStatus.CACHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Job is not completed yet."},
        )

    job_dir = job_manager.get_job_dir(job_id)
    sr_tif = job_dir / "enhanced_2_5m.tif"
    sr_ndvi_png = job_dir / "sr_ndvi.png"

    if not sr_tif.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_FILE.value, "message": "Enhanced GeoTIFF not found."},
        )

    with rasterio.open(sr_tif) as src:
        sr_data = src.read(out_dtype=np.float32)
        dataset_mask = src.dataset_mask() > 0

    _, stats = generate_ndvi_preview(sr_data, sr_ndvi_png, mask=dataset_mask)

    if stats["valid_pixel_count"] == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.NO_VALID_PIXELS.value,
                "message": "No valid surface reflectance pixels found for vegetation index analysis.",
                "suggested_action": "Upload an observation containing valid, non-zero surface reflectance.",
            },
        )

    return VegetationAnalysisResponse(
        job_id=job_id,
        formula="(B08 - B04) / (B08 + B04)",
        valid_pixel_count=stats["valid_pixel_count"],
        min_ndvi=stats["min_ndvi"],
        max_ndvi=stats["max_ndvi"],
        mean_ndvi=stats["mean_ndvi"],
        vegetation_fraction=stats["vegetation_fraction"],
        threshold_used=stats["threshold_used"],
        lr_ndvi_url=f"/api/jobs/{job_id}/previews/lr_ndvi.png",
        sr_ndvi_url=f"/api/jobs/{job_id}/previews/sr_ndvi.png",
        statement="Spectral vegetation screening based on Sentinel-2 B08/B04 reflectance; not ground-truth botanical classification.",
    )


@router.post("/change-detection", response_model=ChangeDetectionResponse)
def compute_change_detection(req: ChangeDetectionRequest) -> ChangeDetectionResponse:
    """
    Calculate spectral change between two completed, spatially aligned 4-band jobs.
    delta = NDVI_after - NDVI_before.
    Strictly verifies CRS, dimensions, band order, affine transform, resolution, and bounds.
    """
    if not job_manager.is_valid_job_id(req.before_job_id) or not job_manager.is_valid_job_id(req.after_job_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid job ID format."},
        )

    if req.before_job_id == req.after_job_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Before and After must be two different completed jobs."},
        )

    job_before = job_manager.get_job(req.before_job_id)
    job_after = job_manager.get_job(req.after_job_id)

    if not job_before or (job_before.status != JobStatus.COMPLETED and job_before.status != JobStatus.CACHED):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Before job '{req.before_job_id}' is not completed."},
        )

    if not job_after or (job_after.status != JobStatus.COMPLETED and job_after.status != JobStatus.CACHED):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"After job '{req.after_job_id}' is not completed."},
        )

    dir_before = job_manager.get_job_dir(req.before_job_id)
    dir_after = job_manager.get_job_dir(req.after_job_id)

    tif_before = dir_before / "enhanced_2_5m.tif"
    tif_after = dir_after / "enhanced_2_5m.tif"

    if not tif_before.exists() or not tif_after.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_FILE.value, "message": "Enhanced GeoTIFF rasters not found."},
        )

    with rasterio.open(tif_before) as src_b, rasterio.open(tif_after) as src_a:
        # 1. CRS Check
        if src_b.crs != src_a.crs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": "Coordinate reference systems (CRS) do not match between observations.",
                    "suggested_action": "Select observations sharing the exact same coordinate system.",
                },
            )

        # 2. Dimensions & Band Count Check
        if (src_b.height, src_b.width) != (src_a.height, src_a.width):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": f"Dimensions mismatch: {src_b.width}x{src_b.height} vs {src_a.width}x{src_a.height}.",
                    "suggested_action": "Both inputs must share identical dimensions.",
                },
            )

        if src_b.count != 4 or src_a.count != 4:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": "Both observations must contain exactly 4 spectral bands.",
                    "suggested_action": "Provide 4-band Sentinel-2 enhanced rasters.",
                },
            )

        # 3. Band Descriptions / Order Check
        desc_b = tuple(src_b.descriptions) if src_b.descriptions else BAND_ORDER
        desc_a = tuple(src_a.descriptions) if src_a.descriptions else BAND_ORDER
        if desc_b != desc_a or desc_b != BAND_ORDER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": "Band order or descriptions do not match expected B04, B03, B02, B08 sequence.",
                    "suggested_action": "Ensure both observations follow B04, B03, B02, B08 band order.",
                },
            )

        # 4. Affine Transform & Resolution Check (Tolerance 1e-4)
        if not np.allclose(src_b.transform, src_a.transform, atol=1e-4):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": "Spatial affine transform mismatch between observations.",
                    "suggested_action": "Select observations covering the exact same spatial grid.",
                },
            )

        # 5. Geographic Bounds Check (Tolerance 1e-3)
        bounds_b = (src_b.bounds.left, src_b.bounds.bottom, src_b.bounds.right, src_b.bounds.top)
        bounds_a = (src_a.bounds.left, src_a.bounds.bottom, src_a.bounds.right, src_a.bounds.top)
        if not np.allclose(bounds_b, bounds_a, atol=1e-3):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INPUTS_NOT_ALIGNED.value,
                    "message": "Geographic bounds mismatch between observations.",
                    "suggested_action": "Select observations sharing identical spatial bounds.",
                },
            )

        data_before = src_b.read(out_dtype=np.float32)
        data_after = src_a.read(out_dtype=np.float32)
        mask_before = src_b.dataset_mask() > 0
        mask_after = src_a.dataset_mask() > 0

    change_filename = f"change_{req.after_job_id[:8]}.png"
    change_png_path = dir_before / change_filename

    try:
        _, change_stats = generate_change_preview(
            before_4band=data_before,
            after_4band=data_after,
            threshold=req.threshold,
            output_png=change_png_path,
            mask_before=mask_before,
            mask_after=mask_after,
        )
    except RasterValidationError as rve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": rve.code.value, "message": rve.message},
        )

    return ChangeDetectionResponse(
        before_job_id=req.before_job_id,
        after_job_id=req.after_job_id,
        threshold=change_stats["threshold"],
        valid_pixel_count=change_stats["valid_pixel_count"],
        changed_pixel_count=change_stats["changed_pixel_count"],
        changed_percentage=change_stats["changed_percentage"],
        vegetation_gain_percentage=change_stats["vegetation_gain_percentage"],
        vegetation_loss_percentage=change_stats["vegetation_loss_percentage"],
        mean_ndvi_delta=change_stats["mean_ndvi_delta"],
        change_preview_url=f"/api/jobs/{req.before_job_id}/previews/{change_filename}",
        statement="NDVI-based spectral change screening; not object-level or ground-truth change detection.",
    )


@router.get("/jobs/{job_id}/previews/{filename}")
def get_job_preview(job_id: str, filename: str):
    """Serve job preview PNG images with strict filename regex and Path.is_relative_to protections."""
    if not job_manager.is_valid_job_id(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid job ID."},
        )

    allowed_previews = {
        "lr_rgb.png",
        "sr_rgb.png",
        "lr_ndvi.png",
        "sr_ndvi.png",
        "lr_fc.png",
        "sr_fc.png",
        "hr_ref.png",
    }
    is_valid_change = bool(CHANGE_PREVIEW_REGEX.match(filename))

    if filename not in allowed_previews and not is_valid_change:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid preview filename requested."},
        )

    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Job '{job_id}' not found."},
        )

    job_dir = job_manager.get_job_dir(job_id)
    file_path = (job_dir / filename).resolve()
    job_dir_resolved = job_dir.resolve()
    outputs_root_resolved = job_manager.outputs_dir.resolve()

    # Strict path containment verification using Path.is_relative_to()
    try:
        if not file_path.is_relative_to(job_dir_resolved) or not job_dir_resolved.is_relative_to(outputs_root_resolved):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Access denied."},
            )
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Access denied."},
        )

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Preview image not generated yet."},
        )

    return FileResponse(file_path, media_type="image/png")


@router.get("/download/{job_id}/geotiff")
def download_geotiff(job_id: str):
    """Download the super-resolved 2.5m GeoTIFF output with Path.is_relative_to validation."""
    if not job_manager.is_valid_job_id(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid job ID."},
        )
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Job '{job_id}' not found."},
        )
    job_dir = job_manager.get_job_dir(job_id)
    file_path = (job_dir / "enhanced_2_5m.tif").resolve()
    job_dir_resolved = job_dir.resolve()
    outputs_root_resolved = job_manager.outputs_dir.resolve()

    try:
        if not file_path.is_relative_to(job_dir_resolved) or not job_dir_resolved.is_relative_to(outputs_root_resolved):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access denied.")
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access denied.")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_FILE.value, "message": "Enhanced GeoTIFF not generated yet."},
        )
    return FileResponse(
        file_path,
        media_type="image/tiff",
        filename=f"geosr_enhanced_2_5m_{job_id[:8]}.tif",
    )
