"""
GeoSR In-Memory Job Manager
Manages job lifecycle state machine, concurrency locks, and job storage.
Owned by recovery/backend.
"""

from __future__ import annotations
import asyncio
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

from app.core.schemas import (
    JobStatus,
    ExecutionMode,
    SourceType,
    JobDetailResponse,
    JobCreateResponse,
    RasterMetadata,
    PreviewURLs,
    ValidationMetrics,
    CacheMetadata,
    DownloadLinks,
    ErrorDetail,
    ErrorCode,
    ModelProvenance,
)

OUTPUTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "outputs" / "jobs"

TERMINAL_STATES = {JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CACHED}


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, JobDetailResponse] = {}
        self._lock = asyncio.Lock()
        self._sync_lock = threading.Lock()

    def create_job(
        self,
        execution_mode: ExecutionMode,
        source_type: SourceType,
        sample_id: Optional[str] = None,
        has_hr_reference: bool = False,
        sample_metadata: Optional[dict] = None,
    ) -> JobCreateResponse:
        with self._sync_lock:
            job_id = str(uuid.uuid4())
            job_dir = OUTPUTS_DIR / job_id
            job_dir.mkdir(parents=True, exist_ok=True)

            now_iso = datetime.now(timezone.utc).isoformat()
            initial_status = JobStatus.QUEUED if execution_mode == ExecutionMode.LIVE else JobStatus.CACHED

            if execution_mode == ExecutionMode.CACHED and sample_metadata:
                metadata = RasterMetadata(
                    crs=sample_metadata.get("crs", "EPSG:32630"),
                    input_shape=(4, 128, 128),
                    output_shape=(4, 512, 512),
                    input_pixel_size_m=10.0,
                    output_pixel_size_m=2.5,
                    bounds=sample_metadata.get("bounds", (350000.0, 4300000.0, 351280.0, 4301280.0)),
                )
                cache_meta = CacheMetadata(
                    cached_at=now_iso,
                    generated_by_model="SEN2SRLite (NonReference_RGBN_x4)",
                    source_sample_checksum=sample_metadata.get("checksum", "verified_demo_sample"),
                )
                previews = PreviewURLs(
                    lr_rgb_url=f"/api/jobs/{job_id}/previews/lr_rgb.png",
                    sr_rgb_url=f"/api/jobs/{job_id}/previews/sr_rgb.png",
                    hr_reference_url=f"/api/jobs/{job_id}/previews/hr_ref.png" if has_hr_reference else None,
                )
                downloads = DownloadLinks(
                    geotiff_url=f"/api/download/{job_id}/geotiff",
                    report_url=f"/api/download/{job_id}/report",
                )
            else:
                metadata = None
                cache_meta = None
                previews = PreviewURLs()
                downloads = DownloadLinks()

            detail = JobDetailResponse(
                job_id=job_id,
                status=initial_status,
                execution_mode=execution_mode,
                cached=(execution_mode == ExecutionMode.CACHED),
                reference_available=has_hr_reference,
                source_type=source_type,
                sample_id=sample_id,
                progress_percent=100 if execution_mode == ExecutionMode.CACHED else 0,
                current_stage="Cached Baseline" if execution_mode == ExecutionMode.CACHED else "Queued",
                processing_duration_s=0.0 if execution_mode == ExecutionMode.CACHED else None,
                device_used="cached_disk" if execution_mode == ExecutionMode.CACHED else None,
                model_provenance=ModelProvenance(),
                metadata=metadata,
                previews=previews,
                metrics=ValidationMetrics(),
                cache_metadata=cache_meta,
                downloads=downloads,
                error=None,
            )

            self._jobs[job_id] = detail

            return JobCreateResponse(
                job_id=job_id,
                status=initial_status,
                execution_mode=execution_mode,
                source=source_type,
                sample_id=sample_id,
                cached=(execution_mode == ExecutionMode.CACHED),
                reference_available=has_hr_reference,
                created_at=now_iso,
            )

    def get_job(self, job_id: str) -> Optional[JobDetailResponse]:
        with self._sync_lock:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    def start_job(self, job_id: str):
        """Transition queued job to running."""
        with self._sync_lock:
            if job_id not in self._jobs:
                return
            job = self._jobs[job_id]
            if job.status == JobStatus.QUEUED:
                job.status = JobStatus.RUNNING
                job.current_stage = "Preprocessing"
                job.progress_percent = 10

    def update_job_progress(self, job_id: str, progress: int, stage: str):
        with self._sync_lock:
            if job_id not in self._jobs:
                return
            job = self._jobs[job_id]
            if job.status != JobStatus.RUNNING:
                return

            job.progress_percent = min(100, max(0, progress))
            job.current_stage = stage

    def complete_job(
        self,
        job_id: str,
        duration_s: float,
        device: str,
        metadata: RasterMetadata,
        previews: PreviewURLs,
        metrics: ValidationMetrics,
        downloads: DownloadLinks,
    ):
        with self._sync_lock:
            if job_id not in self._jobs:
                return
            job = self._jobs[job_id]
            if job.status != JobStatus.RUNNING:
                return

            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.current_stage = "Completed"
            job.processing_duration_s = round(duration_s, 2)
            job.device_used = device
            job.metadata = metadata.model_copy(deep=True)
            job.previews = previews.model_copy(deep=True)
            job.metrics = metrics.model_copy(deep=True)
            job.downloads = downloads.model_copy(deep=True)

    def fail_job(self, job_id: str, error: ErrorDetail):
        with self._sync_lock:
            if job_id not in self._jobs:
                return
            job = self._jobs[job_id]
            if job.status != JobStatus.RUNNING:
                return

            job.status = JobStatus.FAILED
            job.current_stage = "Failed"
            job.error = error.model_copy(deep=True)

    def get_job_dir(self, job_id: str) -> Path:
        return OUTPUTS_DIR / job_id

    @property
    def lock(self) -> asyncio.Lock:
        return self._lock


job_manager = JobManager()
