from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.schemas import (
    CacheMetadata,
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
)
from app.jobs.manager import job_manager
from app.model.adapter import model_adapter
from app.model.provenance import load_model_provenance
from app.processing.raster import (
    INPUT_HEIGHT,
    INPUT_PIXEL_SIZE_M,
    INPUT_WIDTH,
    OUTPUT_PIXEL_SIZE_M,
    SCALE_FACTOR,
    RasterValidationError,
    process_live_geotiff,
    validate_input,
)

logger = logging.getLogger("geosr.api")
router = APIRouter(prefix="/api")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB chunk for streaming
SAMPLES_METADATA_FILE = Path("data/demo/metadata.json")


def _run_inference_sync(input_tif: Path, enhanced_tif: Path, lr_png: Path, sr_png: Path) -> dict[str, Any]:
    """Blocking CPU processing function called inside asyncio.to_thread."""
    if not model_adapter.is_ready():
        model_adapter.load_model()
    return process_live_geotiff(
        input_path=input_tif,
        output_geotiff_path=enhanced_tif,
        lr_preview_path=lr_png,
        sr_preview_path=sr_png,
        adapter=model_adapter,
    )


async def _run_live_inference_pipeline(job_id: str, input_tif: Path):
    """
    Background worker that runs genuine SEN2SRLite model inference in a separate thread.
    Uses an async lock to ensure single-inference concurrency without blocking event loop.
    """
    async with job_manager.lock:
        start_time = time.time()
        job_manager.start_job(job_id)

        try:
            job_dir = job_manager.get_job_dir(job_id)
            enhanced_tif = job_dir / "enhanced_2_5m.tif"
            lr_png = job_dir / "lr_rgb.png"
            sr_png = job_dir / "sr_rgb.png"

            job_manager.update_job_progress(job_id, 40, "Running SEN2SRLite 4x Inference")

            # Execute real model inference in worker thread
            res = await asyncio.to_thread(
                _run_inference_sync,
                input_tif,
                enhanced_tif,
                lr_png,
                sr_png,
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
        except Exception as exc:
            logger.exception("Inference failed for job %s", job_id)
            job_manager.fail_job(
                job_id,
                ErrorDetail(
                    code=ErrorCode.INFERENCE_FAILED,
                    message=f"Live inference execution failed: {str(exc)}",
                    suggested_action="Ensure the model weights are loaded and the GeoTIFF is valid.",
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
    # 1. Reject conflicting file-plus-sample requests
    if file is not None and sample_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.INVALID_REQUEST.value,
                "message": "Cannot provide both 'file' and 'sample_id'. Upload a Sentinel-2 GeoTIFF.",
                "suggested_action": "Submit an uploaded GeoTIFF for live 4x enhancement.",
            },
        )

    # 2. Cached mode rejection for unverified/absent assets
    if execution_mode == ExecutionMode.CACHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.CACHE_NOT_AVAILABLE.value,
                "message": "Cached demonstration mode is disabled pending lawful dataset redistribution verification.",
                "suggested_action": "Use execution_mode='live' with a 4-band 128x128 GeoTIFF upload.",
            },
        )

    # 3. Validate band order
    if band_order != "B04,B03,B02,B08":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.INVALID_BANDS.value,
                "message": f"Unsupported band order: {band_order}. Expected B04,B03,B02,B08.",
                "suggested_action": "Provide input bands in B04 (Red), B03 (Green), B02 (Blue), B08 (NIR) order.",
            },
        )

    # 4. Live Mode Validation
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

        # Stream read file in chunks with strict size limit
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

        # Validate input GeoTIFF structure
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
        except Exception as e:
            job_manager.cancel_and_cleanup_job(create_response.job_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_FILE.value,
                    "message": f"Could not parse uploaded GeoTIFF: {str(e)}",
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


@router.get("/jobs/{job_id}/previews/{filename}")
def get_job_preview(job_id: str, filename: str):
    """Serve job preview PNG images."""
    if not job_manager.is_valid_job_id(job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Invalid job ID."},
        )
    if filename not in {"lr_rgb.png", "sr_rgb.png", "hr_ref.png"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Invalid preview filename: '{filename}'."},
        )
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": f"Job '{job_id}' not found."},
        )
    job_dir = job_manager.get_job_dir(job_id)
    file_path = job_dir / filename
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Preview image not generated yet."},
        )
    return FileResponse(file_path, media_type="image/png")


@router.get("/download/{job_id}/geotiff")
def download_geotiff(job_id: str):
    """Download the super-resolved 2.5m GeoTIFF output."""
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
    file_path = job_dir / "enhanced_2_5m.tif"
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": ErrorCode.INVALID_REQUEST.value, "message": "Enhanced GeoTIFF not generated yet."},
        )
    return FileResponse(
        file_path,
        media_type="image/tiff",
        filename=f"geosr_enhanced_2_5m_{job_id[:8]}.tif",
    )
