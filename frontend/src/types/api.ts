/**
 * GeoSR Core Frontend Types — Authoritative Contract
 * Directly mirrors backend/app/core/schemas.py.
 */

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cached";
export type ExecutionMode = "live" | "cached";
export type SourceType = "sample" | "upload";
export type LayerViewMode = "natural_color" | "vegetation" | "infrared";

export type ErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_FILE"
  | "INVALID_BANDS"
  | "INVALID_CRS"
  | "INVALID_DIMENSIONS"
  | "INVALID_RESOLUTION"
  | "INPUT_TOO_LARGE"
  | "MODEL_NOT_READY"
  | "INFERENCE_FAILED"
  | "REFERENCE_UNAVAILABLE"
  | "CACHE_NOT_AVAILABLE"
  | "EXPORT_FAILED"
  | "INPUTS_NOT_ALIGNED";

export interface ErrorDetail {
  code: ErrorCode;
  message: string;
  detail?: string | null;
  suggested_action?: string | null;
}

export interface ModelProvenance {
  model_name: string;
  model_variant: string;
  code_repository: string;
  artifact_uri: string;
  artifact_revision?: string | null;
  artifact_sha256?: string | null;
  code_license: string;
  weights_license: string;
}

export interface HealthResponse {
  status: string;
  backend_ready: boolean;
  model_ready: boolean;
  model_provenance: ModelProvenance;
  device: string;
  version: string;
}

export interface LicenseInfo {
  license: string;
  attribution: string;
  redistribution_permitted: boolean;
  source_url?: string | null;
}

export interface SampleSummary {
  sample_id: string;
  name: string;
  category: "crop" | "urban" | "reference" | string;
  location: string;
  input_resolution_m: number;
  output_resolution_m: number;
  input_dimensions: [number, number];
  output_dimensions: [number, number];
  has_hr_reference: boolean;
  reference_source?: string | null;
  preview_url: string;
  license_info: LicenseInfo;
}

export interface JobCreateResponse {
  job_id: string;
  status: JobStatus;
  execution_mode: ExecutionMode;
  source: SourceType;
  sample_id?: string | null;
  cached: boolean;
  reference_available: boolean;
  created_at: string;
}

export interface RasterMetadata {
  crs?: string | null;
  input_shape?: [number, number, number] | null;
  output_shape?: [number, number, number] | null;
  input_pixel_size_m?: number | null;
  output_pixel_size_m?: number | null;
  bounds?: [number, number, number, number] | null;
  nodata?: number | null;
}

export interface PreviewURLs {
  lr_rgb_url?: string | null;
  sr_rgb_url?: string | null;
  lr_ndvi_url?: string | null;
  sr_ndvi_url?: string | null;
  lr_fc_url?: string | null;
  sr_fc_url?: string | null;
  hr_reference_url?: string | null;
}

export interface MetricEntry {
  value: number | null;
  reference_available: boolean;
  reference_name?: string | null;
  label: string;
  unit?: string;
  description: string;
}

export interface ValidationMetrics {
  psnr: MetricEntry;
  ssim: MetricEntry;
  reconstruction_consistency: MetricEntry;
}

export interface CacheMetadata {
  cached_at?: string | null;
  generated_by_model?: string | null;
  source_sample_checksum?: string | null;
}

export interface DownloadLinks {
  geotiff_url?: string | null;
  report_url?: string | null;
}

export interface JobDetailResponse {
  job_id: string;
  status: JobStatus;
  execution_mode: ExecutionMode;
  cached: boolean;
  reference_available: boolean;
  source_type: SourceType;
  sample_id?: string | null;
  progress_percent: number;
  current_stage: string;
  processing_duration_s?: number | null;
  device_used?: string | null;
  model_provenance?: ModelProvenance | null;
  metadata?: RasterMetadata | null;
  previews: PreviewURLs;
  metrics: ValidationMetrics;
  cache_metadata?: CacheMetadata | null;
  downloads: DownloadLinks;
  error?: ErrorDetail | null;
}

export interface VegetationAnalysisResponse {
  job_id: string;
  formula: string;
  valid_pixel_count: number;
  min_ndvi: number;
  max_ndvi: number;
  mean_ndvi: number;
  vegetation_fraction: number;
  threshold_used: number;
  lr_ndvi_url: string;
  sr_ndvi_url: string;
  statement: string;
}

export interface ChangeDetectionRequest {
  before_job_id: string;
  after_job_id: string;
  threshold?: number;
}

export interface ChangeDetectionResponse {
  before_job_id: string;
  after_job_id: string;
  threshold: number;
  changed_pixel_count: number;
  changed_percentage: number;
  vegetation_gain_percentage: number;
  vegetation_loss_percentage: number;
  mean_ndvi_delta: number;
  change_preview_url: string;
  statement: string;
}
