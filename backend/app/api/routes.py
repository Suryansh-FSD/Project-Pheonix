"""
GeoSR API Router
Endpoints for Health, Samples, Enhancement Job Creation, Job Status, and Asset Downloads.
Owned by final/backend.
"""

from __future__ import annotations
import asyncio
import io
import json
import os
import shutil
import time
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, status
from fastapi.responses import FileResponse
import rasterio

from app.core.schemas import (
    HealthResponse,
    SampleSummary,
    JobCreateResponse,
    JobDetailResponse,
    ExecutionMode,
    SourceType,
    ErrorCode,
    ErrorDetail,
    ModelProvenance,
    RasterMetadata,
    PreviewURLs,
    ValidationMetrics,
    MetricEntry,
    DownloadLinks,
)
from app.jobs.manager import job_manager
from app.model.adapter import model_adapter
from app.processing.raster import (
    validate_input,
    process_live_geotiff,
    RasterValidationError,
)

router = APIRouter(prefix="/api", tags=["geosr"])

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "demo"
SAMPLES_METADATA_FILE = DATA_DIR / "metadata.json"
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunk


async def _run_live_inference_pipeline(job_id: str, input_raster_path: Path):
    """Background execution runner using concurrency lock and real model adapter."""
    async with job_manager.lock:
        job_manager.start_job(job_id)
        job_dir = job_manager.get_job_dir(job_id)
        output_geotiff = job_dir / "enhanced_2_5m.tif"
        lr_preview = job_dir / "lr_rgb.png"
        sr_preview = job_dir / "sr_rgb.png"

        start_time = time.perf_counter()
        try:
            # Check model readiness or load
            if not model_adapter.is_ready():
                loaded = model_adapter.load_model()
                if not loaded:
                    raise RuntimeError("Failed to load verified SEN2SRLite model weights.")

            # Stage 1: Preprocessing & Live Inference
            job_manager.update_job_progress(job_id, 40, "Running SEN2SRLite 4x Inference")

            # Execute genuine processing pipeline
            pipeline_res = process_live_geotiff(
                input_path=input_raster_path,
                output_geotiff_path=output_geotiff,
                lr_preview_path=lr_preview,
                sr_preview_path=sr_preview,
                adapter=model_adapter,
            )

            job_manager.update_job_progress(job_id, 85, "Writing 2.5m Georeferenced GeoTIFF")
            await asyncio.sleep(0.01)

            elapsed = time.perf_counter() - start_time

            # Stage 2: Complete
            job_manager.complete_job(
                job_id=job_id,
                duration_s=elapsed,
                device=str(model_adapter.device),
                metadata=RasterMetadata(
                    crs=pipeline_res["crs"],
                    input_shape=pipeline_res["input_shape"],
                    output_shape=pipeline_res["output_shape"],
                    input_pixel_size_m=pipeline_res["input_pixel_size_m"],
                    output_pixel_size_m=pipeline_res["output_pixel_size_m"],
                    bounds=pipeline_res["bounds"],
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
                        description="Diagnostic only; not ground-truth accuracy.",
                    ),
                ),
                downloads=DownloadLinks(
                    geotiff_url=f"/api/download/{job_id}/geotiff",
                    report_url=None,
                ),
            )
        except Exception as exc:
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
        model_provenance=ModelProvenance(
            artifact_revision="1.1.0",
            artifact_sha256="479aa796d5068d0b1206118ccbca27bd3223df0214db1a9b31a1e18349ed1c7e",
            weights_license="unverified",
        ),
        device=str(model_adapter.device) if is_ready else "unavailable",
        version="1.0.0",
    )


@router.get("/samples", response_model=List[SampleSummary])
def list_samples() -> List[SampleSummary]:
    """List bundled verified samples from metadata.json."""
    if not SAMPLES_METADATA_FILE.exists():
        return []
    try:
        with open(SAMPLES_METADATA_FILE, "r") as f:
            data = json.load(f)
            return [SampleSummary.model_validate(s) for s in data.get("samples", [])]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load sample metadata: {str(e)}",
        )


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
    Strictly differentiates between live inference and cached execution.
    """
    # 1. Reject conflicting file-plus-sample requests
    if file is not None and sample_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.INVALID_REQUEST.value,
                "message": "Cannot provide both 'file' and 'sample_id'. Choose either an upload or a sample.",
                "suggested_action": "Submit either an uploaded GeoTIFF or select a bundled sample ID, not both.",
            },
        )

    # 2. Cached Mode Validation
    if execution_mode == ExecutionMode.CACHED:
        if file is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_REQUEST.value,
                    "message": "Cached execution is permitted only for bundled demo samples, not arbitrary file uploads.",
                    "suggested_action": "Use execution_mode='live' for file uploads, or select a bundled sample_id for cached mode.",
                },
            )
        if not sample_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_REQUEST.value,
                    "message": "sample_id is required when execution_mode is 'cached'.",
                    "suggested_action": "Provide a valid sample_id from /api/samples.",
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

        # Load and verify sample-specific cached files
        if not SAMPLES_METADATA_FILE.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": ErrorCode.CACHE_NOT_AVAILABLE.value,
                    "message": "Sample metadata manifest not found on server.",
                    "suggested_action": "Ensure demo assets are staged.",
                },
            )

        with open(SAMPLES_METADATA_FILE, "r") as f:
            manifest_data = json.load(f)

        sample_info = next((s for s in manifest_data.get("samples", []) if s.get("sample_id") == sample_id), None)
        if not sample_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": ErrorCode.CACHE_NOT_AVAILABLE.value,
                    "message": f"Sample '{sample_id}' not found in verified manifest.",
                    "suggested_action": "Select a valid sample identifier from /api/samples.",
                },
            )

        # Verify cached asset directory exists
        sample_cache_dir = DATA_DIR / "cache" / sample_id
        cached_sr_tif = sample_cache_dir / "sr_output.tif"
        cached_lr_png = sample_cache_dir / "lr_rgb.png"
        cached_sr_png = sample_cache_dir / "sr_rgb.png"

        if not (cached_sr_tif.exists() and cached_lr_png.exists() and cached_sr_png.exists()):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": ErrorCode.CACHE_NOT_AVAILABLE.value,
                    "message": f"Cached output assets for '{sample_id}' are incomplete or missing on disk.",
                    "suggested_action": "Run live enhancement for this sample.",
                },
            )

        # Create cached job and stage real assets
        create_response = job_manager.create_job(
            execution_mode=ExecutionMode.CACHED,
            source_type=SourceType.SAMPLE,
            sample_id=sample_id,
            sample_info=sample_info,
        )

        job_dir = job_manager.get_job_dir(create_response.job_id)
        shutil.copyfile(cached_sr_tif, job_dir / "enhanced_2_5m.tif")
        shutil.copyfile(cached_lr_png, job_dir / "lr_rgb.png")
        shutil.copyfile(cached_sr_png, job_dir / "sr_rgb.png")
        hr_png = sample_cache_dir / "hr_ref.png"
        if hr_png.exists():
            shutil.copyfile(hr_png, job_dir / "hr_ref.png")

        return create_response

    # 3. Validate band order for live mode
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
        if not file and not sample_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": ErrorCode.INVALID_REQUEST.value,
                    "message": "Either 'file' or 'sample_id' must be provided for live inference.",
                    "suggested_action": "Upload a four-band GeoTIFF or choose a bundled sample_id.",
                },
            )

        # Handle sample_id live mode
        if sample_id:
            sample_tif = DATA_DIR / f"{sample_id}.tif"
            if not sample_tif.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "code": ErrorCode.INVALID_REQUEST.value,
                        "message": f"Genuine sample raster for '{sample_id}' not found on server.",
                        "suggested_action": "Select a valid sample_id from /api/samples.",
                    },
                )

            with open(SAMPLES_METADATA_FILE, "r") as f:
                manifest_data = json.load(f)
            sample_info = next((s for s in manifest_data.get("samples", []) if s.get("sample_id") == sample_id), None)

            create_response = job_manager.create_job(
                execution_mode=ExecutionMode.LIVE,
                source_type=SourceType.SAMPLE,
                sample_id=sample_id,
                sample_info=sample_info,
            )
            job_dir = job_manager.get_job_dir(create_response.job_id)
            input_tif = job_dir / "input.tif"
            shutil.copyfile(sample_tif, input_tif)

            background_tasks.add_task(_run_live_inference_pipeline, create_response.job_id, input_tif)
            return create_response

        # Handle file upload live mode with bounded streaming chunks
        if file is not None:
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
                input_tif.unlink(missing_ok=True)
                raise

            # Validate input GeoTIFF structure
            try:
                validate_input(input_tif)
            except RasterValidationError as rve:
                input_tif.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": rve.code.value,
                        "message": rve.message,
                        "suggested_action": "Ensure the file is a 4-band 128x128 GeoTIFF with projected CRS and 10m pixel size.",
                    },
                )
            except Exception as e:
                input_tif.unlink(missing_ok=True)
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
    if filename not in {"lr_rgb.png", "sr_rgb.png", "hr_ref.png"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preview not found")
    job_dir = job_manager.get_job_dir(job_id)
    file_path = job_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preview image not generated yet")
    return FileResponse(file_path, media_type="image/png")


@router.get("/download/{job_id}/geotiff")
def download_geotiff(job_id: str):
    """Download the super-resolved 2.5m GeoTIFF output."""
    job_dir = job_manager.get_job_dir(job_id)
    file_path = job_dir / "enhanced_2_5m.tif"
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enhanced GeoTIFF not generated yet")
    return FileResponse(
        file_path,
        media_type="image/tiff",
        filename=f"geosr_enhanced_2_5m_{job_id[:8]}.tif",
    )
