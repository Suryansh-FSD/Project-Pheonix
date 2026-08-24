"""
GeoSR Core Schemas — Authoritative Contract
Authoritative schema definitions for API requests, responses, and domain entities.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CACHED = "cached"


class ExecutionMode(str, Enum):
    LIVE = "live"
    CACHED = "cached"


class SourceType(str, Enum):
    SAMPLE = "sample"
    UPLOAD = "upload"


class LayerViewMode(str, Enum):
    NATURAL_COLOR = "natural_color"
    VEGETATION = "vegetation"
    INFRARED = "infrared"


class ErrorCode(str, Enum):
    INVALID_REQUEST = "INVALID_REQUEST"
    INVALID_FILE = "INVALID_FILE"
    INVALID_BANDS = "INVALID_BANDS"
    INVALID_CRS = "INVALID_CRS"
    INVALID_DIMENSIONS = "INVALID_DIMENSIONS"
    INVALID_RESOLUTION = "INVALID_RESOLUTION"
    INPUT_TOO_LARGE = "INPUT_TOO_LARGE"
    MODEL_NOT_READY = "MODEL_NOT_READY"
    INFERENCE_FAILED = "INFERENCE_FAILED"
    REFERENCE_UNAVAILABLE = "REFERENCE_UNAVAILABLE"
    CACHE_NOT_AVAILABLE = "CACHE_NOT_AVAILABLE"
    EXPORT_FAILED = "EXPORT_FAILED"
    INPUTS_NOT_ALIGNED = "INPUTS_NOT_ALIGNED"


class ErrorDetail(BaseModel):
    code: ErrorCode
    message: str
    detail: Optional[str] = None
    suggested_action: Optional[str] = None


class ModelProvenance(BaseModel):
    model_name: str = "SEN2SRLite"
    model_variant: str = "NonReference_RGBN_x4"
    code_repository: str = "https://github.com/ESAOpenSR/SEN2SR"
    artifact_uri: str = "tacofoundation/sen2sr/SEN2SRLite/NonReference_RGBN_x4"
    artifact_revision: Optional[str] = None
    artifact_sha256: Optional[str] = None
    code_license: str = "CC0-1.0"
    weights_license: str = "unverified"


class HealthResponse(BaseModel):
    status: str = "ok"
    backend_ready: bool = True
    model_ready: bool = False
    model_provenance: ModelProvenance = Field(default_factory=ModelProvenance)
    device: str = "unavailable"
    version: str = "1.0.0"


class LicenseInfo(BaseModel):
    license: str
    attribution: str
    redistribution_permitted: bool
    source_url: Optional[str] = None


class SampleSummary(BaseModel):
    sample_id: str
    name: str
    category: str  # "crop" | "urban"
    location: str
    input_resolution_m: float = 10.0
    output_resolution_m: float = 2.5
    input_dimensions: Tuple[int, int] = (128, 128)
    output_dimensions: Tuple[int, int] = (512, 512)
    has_hr_reference: bool
    reference_source: Optional[str] = None
    preview_url: str
    license_info: LicenseInfo


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    execution_mode: ExecutionMode
    source: SourceType
    sample_id: Optional[str] = None
    cached: bool
    reference_available: bool
    created_at: str


class RasterMetadata(BaseModel):
    crs: Optional[str] = None
    input_shape: Optional[Tuple[int, int, int]] = None  # (4, 128, 128)
    output_shape: Optional[Tuple[int, int, int]] = None  # (4, 512, 512)
    input_pixel_size_m: Optional[float] = None
    output_pixel_size_m: Optional[float] = None
    bounds: Optional[Tuple[float, float, float, float]] = None  # (min_x, min_y, max_x, max_y)
    nodata: Optional[float] = None


class PreviewURLs(BaseModel):
    lr_rgb_url: Optional[str] = None
    sr_rgb_url: Optional[str] = None
    lr_ndvi_url: Optional[str] = None
    sr_ndvi_url: Optional[str] = None
    lr_fc_url: Optional[str] = None
    sr_fc_url: Optional[str] = None
    hr_reference_url: Optional[str] = None


class MetricEntry(BaseModel):
    value: Optional[float] = None
    reference_available: bool
    reference_name: Optional[str] = None
    label: str
    unit: str = ""
    description: str


class ValidationMetrics(BaseModel):
    psnr: MetricEntry = Field(
        default_factory=lambda: MetricEntry(
            value=None,
            reference_available=False,
            reference_name=None,
            label="PSNR",
            unit="dB",
            description="Peak Signal-to-Noise Ratio calculated against aligned high-resolution reference.",
        )
    )
    ssim: MetricEntry = Field(
        default_factory=lambda: MetricEntry(
            value=None,
            reference_available=False,
            reference_name=None,
            label="SSIM",
            unit="",
            description="Structural Similarity Index calculated against aligned high-resolution reference.",
        )
    )
    reconstruction_consistency: MetricEntry = Field(
        default_factory=lambda: MetricEntry(
            value=None,
            reference_available=False,
            reference_name=None,
            label="Reconstruction Consistency",
            unit="",
            description="Correlation of downsampled 2.5m SR output to 10m LR grid (diagnostic only; not ground-truth accuracy).",
        )
    )


class CacheMetadata(BaseModel):
    cached_at: Optional[str] = None
    generated_by_model: Optional[str] = None
    source_sample_checksum: Optional[str] = None


class DownloadLinks(BaseModel):
    geotiff_url: Optional[str] = None
    report_url: Optional[str] = None


class JobDetailResponse(BaseModel):
    job_id: str
    status: JobStatus
    execution_mode: ExecutionMode
    cached: bool
    reference_available: bool
    source_type: SourceType
    sample_id: Optional[str] = None
    progress_percent: int = 0
    current_stage: str = "Initialized"
    processing_duration_s: Optional[float] = None
    device_used: Optional[str] = None
    model_provenance: Optional[ModelProvenance] = None
    metadata: Optional[RasterMetadata] = None
    previews: PreviewURLs = Field(default_factory=PreviewURLs)
    metrics: ValidationMetrics = Field(default_factory=ValidationMetrics)
    cache_metadata: Optional[CacheMetadata] = None
    downloads: DownloadLinks = Field(default_factory=DownloadLinks)
    error: Optional[ErrorDetail] = None


class VegetationAnalysisResponse(BaseModel):
    job_id: str
    formula: str = "(B08 - B04) / (B08 + B04)"
    valid_pixel_count: int
    min_ndvi: float
    max_ndvi: float
    mean_ndvi: float
    vegetation_fraction: float
    threshold_used: float = 0.3
    lr_ndvi_url: str
    sr_ndvi_url: str
    statement: str = "Spectral vegetation screening based on Sentinel-2 B08/B04 reflectance; not ground-truth botanical classification."


class ChangeDetectionRequest(BaseModel):
    before_job_id: str
    after_job_id: str
    threshold: float = Field(default=0.15, ge=0.01, le=1.0)


class ChangeDetectionResponse(BaseModel):
    before_job_id: str
    after_job_id: str
    threshold: float
    changed_pixel_count: int
    changed_percentage: float
    vegetation_gain_percentage: float
    vegetation_loss_percentage: float
    mean_ndvi_delta: float
    change_preview_url: str
    statement: str = "NDVI-based spectral change screening; not object-level or ground-truth change detection."
