from app.jobs.manager import job_manager
from app.core.schemas import (
    ExecutionMode,
    SourceType,
    JobStatus,
    ErrorDetail,
    ErrorCode,
    RasterMetadata,
    PreviewURLs,
    ValidationMetrics,
    DownloadLinks,
)


def test_job_lifecycle_state_transitions():
    create_res = job_manager.create_job(
        execution_mode=ExecutionMode.LIVE,
        source_type=SourceType.SAMPLE,
        sample_id="spain_crops_01",
    )
    job_id = create_res.job_id
    assert create_res.status == JobStatus.QUEUED

    # Transition queued -> running
    job_manager.start_job(job_id)
    assert job_manager.get_job(job_id).status == JobStatus.RUNNING

    # Update progress
    job_manager.update_job_progress(job_id, 45, "Running SEN2SRLite Inference")
    job = job_manager.get_job(job_id)
    assert job.status == JobStatus.RUNNING
    assert job.progress_percent == 45
    assert job.current_stage == "Running SEN2SRLite Inference"

    # Complete job from running
    job_manager.complete_job(
        job_id,
        0.512,
        "cpu",
        RasterMetadata(),
        PreviewURLs(),
        ValidationMetrics(),
        DownloadLinks(),
    )
    completed_job = job_manager.get_job(job_id)
    assert completed_job.status == JobStatus.COMPLETED
    assert completed_job.processing_duration_s == 0.512


def test_failed_job_immutability():
    create_res = job_manager.create_job(
        execution_mode=ExecutionMode.LIVE,
        source_type=SourceType.SAMPLE,
        sample_id="spain_crops_01",
    )
    job_id = create_res.job_id
    job_manager.start_job(job_id)

    # Fail job safely
    job_manager.fail_job(
        job_id,
        ErrorDetail(
            code=ErrorCode.INFERENCE_FAILED,
            message="Initial allocation failure",
            suggested_action="Retry inference."
        )
    )
    failed_job = job_manager.get_job(job_id)
    assert failed_job.status == JobStatus.FAILED
    assert failed_job.error.message == "Initial allocation failure"

    # Invariant 1: progress update does not resurrect
    job_manager.update_job_progress(job_id, 90, "Resurrection attempt")
    assert job_manager.get_job(job_id).status == JobStatus.FAILED

    # Invariant 2: complete_job does not resurrect
    job_manager.complete_job(
        job_id,
        1.2,
        "cpu",
        RasterMetadata(),
        PreviewURLs(),
        ValidationMetrics(),
        DownloadLinks(),
    )
    assert job_manager.get_job(job_id).status == JobStatus.FAILED

    # Invariant 3: repeated fail_job does not mutate terminal error
    job_manager.fail_job(
        job_id,
        ErrorDetail(
            code=ErrorCode.INFERENCE_FAILED,
            message="Second overwrite attempt",
        )
    )
    assert job_manager.get_job(job_id).error.message == "Initial allocation failure"


def test_cached_job_sample_info_and_deep_copy():
    sample_info = {
        "sample_id": "spain_crops_01",
        "crs": "EPSG:32630",
        "bounds": [350000.0, 4300000.0, 351280.0, 4301280.0],
        "checksum_sha256": "abc123sha",
        "has_hr_reference": True,
        "reference_source": "OpenSR Test",
        "cached_metrics": {"psnr": 33.35, "ssim": 0.8311}
    }
    create_res = job_manager.create_job(
        execution_mode=ExecutionMode.CACHED,
        source_type=SourceType.SAMPLE,
        sample_id="spain_crops_01",
        sample_info=sample_info,
    )
    job_id = create_res.job_id
    assert create_res.status == JobStatus.CACHED

    job = job_manager.get_job(job_id)
    assert job.status == JobStatus.CACHED
    assert job.cache_metadata.source_sample_checksum == "abc123sha"
    assert job.metrics.psnr.value == 33.35

    # Deep copy check: mutating returned object does not alter internal state
    job_copy = job_manager.get_job(job_id)
    job_copy.status = JobStatus.RUNNING
    assert job_manager.get_job(job_id).status == JobStatus.CACHED
