from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from app.core.schemas import (
    CacheMetadata,
    DownloadLinks,
    ErrorDetail,
    ErrorCode,
    ExecutionMode,
    JobCreateResponse,
    JobDetailResponse,
    JobStatus,
    MetricEntry,
    ModelProvenance,
    RasterMetadata,
    PreviewURLs,
    SourceType,
    ValidationMetrics,
)
from app.model.provenance import load_model_provenance

OUTPUTS_DIR = Path(os.environ.get("GEOSR_OUTPUTS_DIR", "outputs/jobs"))
JOB_TTL_SECONDS = int(os.environ.get("GEOSR_JOB_TTL_SECONDS", "86400"))  # 24 hours
MAX_STORED_JOBS = int(os.environ.get("GEOSR_MAX_STORED_JOBS", "100"))
UUID_REGEX = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


class JobManager:
    """Thread-safe and asynchronous job state manager for super-resolution tasks."""

    def __init__(self):
        self._jobs: Dict[str, JobDetailResponse] = {}
        self._job_timestamps: Dict[str, float] = {}
        self._lock = asyncio.Lock()
        self._sync_lock = threading.Lock()
        OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    @property
    def outputs_dir(self) -> Path:
        return OUTPUTS_DIR

    def is_valid_job_id(self, job_id: str) -> bool:
        return bool(UUID_REGEX.match(job_id))

    def create_job(
        self,
        execution_mode: ExecutionMode,
        source_type: SourceType,
        sample_id: Optional[str] = None,
        sample_info: Optional[dict] = None,
    ) -> JobCreateResponse:
        with self._sync_lock:
            self._cleanup_expired_jobs()

            job_id = str(uuid.uuid4())
            job_dir = OUTPUTS_DIR / job_id
            job_dir.mkdir(parents=True, exist_ok=True)

            now_iso = datetime.now(timezone.utc).isoformat()
            self._job_timestamps[job_id] = time.time()
            initial_status = JobStatus.QUEUED if execution_mode == ExecutionMode.LIVE else JobStatus.CACHED
            has_hr_ref = sample_info.get("has_hr_reference", False) if sample_info else False

            prov_info = load_model_provenance()
            prov_model = ModelProvenance(
                artifact_revision=prov_info.artifact_revision,
                artifact_sha256=prov_info.artifact_sha256,
                weights_license=prov_info.weights_license,
            )

            if execution_mode == ExecutionMode.CACHED and sample_info:
                cached_metrics = sample_info.get("cached_metrics", {})
                psnr_val = cached_metrics.get("psnr")
                ssim_val = cached_metrics.get("ssim")

                metadata = RasterMetadata(
                    crs=sample_info.get("crs"),
                    input_shape=(4, 128, 128),
                    output_shape=(4, 512, 512),
                    input_pixel_size_m=sample_info.get("input_resolution_m", 10.0),
                    output_pixel_size_m=sample_info.get("output_resolution_m", 2.5),
                    bounds=tuple(sample_info.get("bounds", ())),
                )
                cache_meta = CacheMetadata(
                    cached_at=now_iso,
                    generated_by_model="SEN2SRLite (NonReference_RGBN_x4)",
                    source_sample_checksum=sample_info.get("checksum_sha256"),
                )
                previews = PreviewURLs(
                    lr_rgb_url=f"/api/jobs/{job_id}/previews/lr_rgb.png",
                    sr_rgb_url=f"/api/jobs/{job_id}/previews/sr_rgb.png",
                    hr_reference_url=f"/api/jobs/{job_id}/previews/hr_ref.png" if has_hr_ref else None,
                )
                metrics = ValidationMetrics(
                    psnr=MetricEntry(
                        value=psnr_val,
                        reference_available=has_hr_ref,
                        reference_name=sample_info.get("reference_source"),
                        label="PSNR",
                        unit="dB",
                        description="Peak Signal-to-Noise Ratio calculated against aligned high-resolution reference.",
                    ),
                    ssim=MetricEntry(
                        value=ssim_val,
                        reference_available=has_hr_ref,
                        reference_name=sample_info.get("reference_source"),
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
                )
                downloads = DownloadLinks(
                    geotiff_url=f"/api/download/{job_id}/geotiff",
                    report_url=None,
                )
            else:
                metadata = None
                cache_meta = None
                previews = PreviewURLs()
                metrics = ValidationMetrics()
                downloads = DownloadLinks()

            detail = JobDetailResponse(
                job_id=job_id,
                status=initial_status,
                execution_mode=execution_mode,
                cached=(execution_mode == ExecutionMode.CACHED),
                reference_available=has_hr_ref,
                source_type=source_type,
                sample_id=sample_id,
                progress_percent=100 if execution_mode == ExecutionMode.CACHED else 0,
                current_stage="Cached Baseline" if execution_mode == ExecutionMode.CACHED else "Queued",
                processing_duration_s=0.0 if execution_mode == ExecutionMode.CACHED else None,
                device_used="cached_disk" if execution_mode == ExecutionMode.CACHED else None,
                model_provenance=prov_model,
                metadata=metadata,
                previews=previews,
                metrics=metrics,
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
                reference_available=has_hr_ref,
                created_at=now_iso,
            )

    def get_job(self, job_id: str) -> Optional[JobDetailResponse]:
        if not self.is_valid_job_id(job_id):
            return None
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
            job.processing_duration_s = round(duration_s, 3)
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
            if job.status not in (JobStatus.RUNNING, JobStatus.QUEUED):
                return

            job.status = JobStatus.FAILED
            job.current_stage = "Failed"
            job.error = error.model_copy(deep=True)

    def get_job_dir(self, job_id: str) -> Path:
        if not self.is_valid_job_id(job_id):
            raise ValueError(f"Invalid job_id format: '{job_id}'")
        return OUTPUTS_DIR / job_id

    def cancel_and_cleanup_job(self, job_id: str):
        """Immediately remove an unstarted or invalid job."""
        with self._sync_lock:
            self._remove_job(job_id)

    def _cleanup_expired_jobs(self):
        """Remove jobs older than TTL or exceeding capacity."""
        now = time.time()
        expired_ids = [
            jid for jid, ts in self._job_timestamps.items()
            if (now - ts) > JOB_TTL_SECONDS
        ]
        for jid in expired_ids:
            self._remove_job(jid)

        if len(self._jobs) > MAX_STORED_JOBS:
            sorted_by_age = sorted(self._job_timestamps.items(), key=lambda x: x[1])
            excess = len(self._jobs) - MAX_STORED_JOBS
            for jid, _ in sorted_by_age[:excess]:
                self._remove_job(jid)

    def _remove_job(self, job_id: str):
        self._jobs.pop(job_id, None)
        self._job_timestamps.pop(job_id, None)
        job_dir = OUTPUTS_DIR / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir, ignore_errors=True)

    @property
    def lock(self) -> asyncio.Lock:
        return self._lock


job_manager = JobManager()
