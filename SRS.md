# GeoSR Software Requirements Specification

## 1. Purpose

This document defines the functional, non-functional, interface, data, and verification requirements for the GeoSR MVP. GeoSR transforms compatible 10 m Sentinel-2 RGB+NIR imagery into a 2.5 m output using a pretrained 4x super-resolution model.

## 2. Scope

The MVP consists of:

- A React web client.
- A local FastAPI service.
- ESA SEN2SRLite inference.
- GeoTIFF preprocessing and export.
- Reference-based validation for bundled samples.
- NDVI and green-cover analysis.
- A local demo and cached fallback mode.

Authentication, multi-user operation, live Copernicus ingestion, and large-area production processing are excluded.

## 3. System actors

| Actor | Description |
| --- | --- |
| Analyst | Uploads or selects imagery, runs enhancement, analyzes and exports |
| Demonstrator | Uses bundled samples and explains the workflow |
| Maintainer | Installs dependencies, manages samples and model weights |
| External model repository | Supplies the pretrained SEN2SRLite weights during setup |

## 4. Operating environment

### 4.1 Client

- Modern Chromium, Firefox, or Safari browser.
- Desktop viewport is the primary target.
- JavaScript and WebGL enabled for mapping.

### 4.2 Server

- Python 3.11 recommended.
- CPU execution required; CUDA optional.
- Local filesystem access for temporary jobs and outputs.
- Minimum practical memory target: 8 GB for the small-patch MVP.

## 5. Functional requirements

### 5.1 Application status

| ID | Requirement |
| --- | --- |
| FR-001 | The server shall expose a health endpoint. |
| FR-002 | The client shall show backend and model readiness separately. |
| FR-003 | The client shall not enable enhancement until an input is valid and the backend is ready. |

### 5.2 Sample and upload handling

| ID | Requirement |
| --- | --- |
| FR-010 | The system shall list bundled urban and crop samples. |
| FR-011 | The system shall accept GeoTIFF upload using multipart form data. |
| FR-012 | The system shall validate MIME type, extension, size, dimensions, band count, CRS, transform, and numerical range. |
| FR-013 | The system shall require or infer a B04, B03, B02, B08 band mapping. |
| FR-014 | The system shall reject an invalid input without starting inference. |
| FR-015 | The system shall return a user-correctable error code and message. |

### 5.3 Preprocessing

| ID | Requirement |
| --- | --- |
| FR-020 | The system shall read the four analytical bands as float32. |
| FR-021 | The system shall normalize expected Sentinel-2 reflectance values to the model range. |
| FR-022 | The system shall replace NaN and infinite values using a documented policy. |
| FR-023 | The system shall preserve source CRS, affine transform, bounds, and acquisition metadata when available. |
| FR-024 | Display stretching shall not modify analytical output values. |

### 5.4 Super-resolution inference

| ID | Requirement |
| --- | --- |
| FR-030 | The MVP shall use SEN2SRLite NonReference_RGBN_x4. |
| FR-031 | The model shall be loaded once during service startup or first use. |
| FR-032 | The system shall select CUDA when available and CPU otherwise. |
| FR-033 | A source tensor with shape 4 by H by W shall produce 4 by 4H by 4W. |
| FR-034 | The system shall expose processing state: queued, running, completed, failed, or cached. |
| FR-035 | The system shall record model identifier, runtime device, start time, end time, and processing duration. |
| FR-036 | The system shall prevent concurrent requests from exhausting local memory. |

### 5.5 Postprocessing and GeoTIFF

| ID | Requirement |
| --- | --- |
| FR-040 | The output affine pixel size shall equal the input pixel size divided by four. |
| FR-041 | The output geographic extent shall remain consistent with the source extent, subject to documented border handling. |
| FR-042 | The output shall contain B04, B03, B02, and B08 in a documented order. |
| FR-043 | The system shall create a natural-color preview using percentile stretching. |
| FR-044 | The system shall produce a downloadable GeoTIFF. |

### 5.6 Comparison

| ID | Requirement |
| --- | --- |
| FR-050 | The client shall show original and enhanced previews in the same viewport. |
| FR-051 | A keyboard-accessible range control shall adjust the comparison boundary. |
| FR-052 | The client shall label source and output resolutions. |
| FR-053 | The client shall provide natural-color, vegetation, and infrared views when supported. |

### 5.7 Validation and trust

| ID | Requirement |
| --- | --- |
| FR-060 | The system shall compute PSNR and SSIM only when an aligned high-resolution reference is present. |
| FR-061 | The API shall return reference_available=false when no reference exists. |
| FR-062 | The client shall display Reference unavailable rather than a fabricated number. |
| FR-063 | The system may compute reconstruction consistency by reducing SR output to source resolution. |
| FR-064 | Reconstruction consistency shall not be labeled as ground-truth accuracy or formal uncertainty. |
| FR-065 | Cached results shall be visibly marked as cached. |

### 5.8 NDVI analysis

| ID | Requirement |
| --- | --- |
| FR-070 | The system shall calculate NDVI from enhanced B08 and B04 values. |
| FR-071 | The system shall protect the denominator with a small epsilon and mask invalid pixels. |
| FR-072 | The system shall return an NDVI raster, preview, and green-cover percentage. |
| FR-073 | The green-cover threshold shall be configuration-driven and shown in the report. |
| FR-074 | The system shall never calculate analytical NDVI from an RGB preview. |

### 5.9 Export

| ID | Requirement |
| --- | --- |
| FR-080 | The system shall allow enhanced GeoTIFF download. |
| FR-081 | The system shall allow RGB and NDVI preview download. |
| FR-082 | The system shall generate a PDF report for completed jobs. |
| FR-083 | The report shall include input metadata, model identifier, device, duration, available metrics, limitations, and comparison images. |

### 5.10 Demo mode

| ID | Requirement |
| --- | --- |
| FR-090 | The application shall bundle at least two demo inputs and their cached outputs. |
| FR-091 | Demo Mode shall prefer live inference when available. |
| FR-092 | On approved fallback, Demo Mode shall load the corresponding cached result. |
| FR-093 | The UI shall clearly differentiate a cached result from live inference. |

## 6. Non-functional requirements

### 6.1 Performance

| ID | Requirement |
| --- | --- |
| NFR-001 | The dashboard shall become interactive within three seconds on the presentation laptop after local services start. |
| NFR-002 | Model weights shall be preloaded before the live demonstration. |
| NFR-003 | The MVP shall process only bounded patch sizes to prevent memory exhaustion. |
| NFR-004 | UI interaction, including the comparison slider, shall remain responsive during backend processing. |

### 6.2 Reliability

| ID | Requirement |
| --- | --- |
| NFR-010 | The bundled demo shall operate without internet after initial installation. |
| NFR-011 | Every processing job shall end in completed, failed, or cached state. |
| NFR-012 | Temporary output names shall be collision-resistant. |
| NFR-013 | The service shall recover from a failed job without restart. |

### 6.3 Usability and accessibility

| ID | Requirement |
| --- | --- |
| NFR-020 | The primary workflow shall be visible as Select, Enhance, Analyze, Export. |
| NFR-021 | Interactive elements shall have visible focus states and accessible names. |
| NFR-022 | Color shall not be the only means of conveying status. |
| NFR-023 | Motion shall respect prefers-reduced-motion. |
| NFR-024 | Errors shall state what happened and how to correct it. |

### 6.4 Security and privacy

| ID | Requirement |
| --- | --- |
| NFR-030 | The backend shall validate filenames and never execute uploaded content. |
| NFR-031 | Uploaded files shall be stored outside publicly served directories. |
| NFR-032 | The API shall restrict allowed origins in non-development environments. |
| NFR-033 | Temporary jobs shall be removable through a cleanup policy. |
| NFR-034 | No API keys shall be committed to the repository. |

### 6.5 Maintainability

| ID | Requirement |
| --- | --- |
| NFR-040 | Frontend and backend concerns shall remain separated. |
| NFR-041 | Model inference shall be behind an adapter interface. |
| NFR-042 | Processing functions shall be testable without starting the web server. |
| NFR-043 | Dependency versions shall be locked after the MVP works. |

## 7. External interfaces

### 7.1 HTTP API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /api/health | Service and model readiness |
| GET | /api/samples | List bundled samples |
| POST | /api/enhance | Create an enhancement job |
| GET | /api/jobs/{job_id} | Read job status and results |
| POST | /api/validate | Validate output with an optional reference |
| POST | /api/analyze/ndvi | Generate NDVI for a completed job |
| GET | /api/download/{job_id}/geotiff | Download enhanced GeoTIFF |
| GET | /api/download/{job_id}/report | Download PDF report |

### 7.2 Enhance request

Multipart fields:

- file: optional uploaded GeoTIFF.
- sample_id: optional bundled sample identifier.
- band_order: defaults to B04,B03,B02,B08.
- allow_cached_fallback: boolean.

Exactly one of file or sample_id must be supplied.

### 7.3 Job response

~~~json
{
  "job_id": "uuid",
  "status": "queued",
  "source": "sample",
  "cached": false,
  "reference_available": true
}
~~~

Completed results include preview URLs, metadata, dimensions, resolutions, processing time, available metrics, and download links.

## 8. Data requirements

### 8.1 Input raster

- Four analytical bands.
- Expected order: B04, B03, B02, B08.
- CRS and affine transform required for geospatial export.
- Reflectance scaling documented in metadata or user guidance.

### 8.2 Bundled sample

- Low-resolution Sentinel-2 L2A patch.
- Aligned 2.5 m high-resolution reference.
- Sample identifier, category, location label, and license attribution.
- Cached output produced by the same pinned model.

### 8.3 Job record

~~~text
job_id
status
input_path
output_path
preview_paths
sample_id
reference_path
input_metadata
model_metadata
metrics
error
created_at
completed_at
cached
~~~

## 9. Error model

| Code | Meaning | User response |
| --- | --- | --- |
| INVALID_FILE | Unsupported or unreadable file | Upload a GeoTIFF |
| INVALID_BANDS | Missing or ambiguous band mapping | Provide B04,B03,B02,B08 |
| INVALID_CRS | CRS missing | Use a georeferenced input |
| INPUT_TOO_LARGE | Patch exceeds MVP limit | Crop a smaller area |
| MODEL_NOT_READY | Weights not loaded | Use bundled cached demo or retry |
| INFERENCE_FAILED | Model execution failed | Retry or use cached demo |
| REFERENCE_UNAVAILABLE | HR metrics cannot be computed | Continue with visual and consistency checks |
| EXPORT_FAILED | Output could not be written | Preserve job and retry export |

## 10. Verification and testing

### 10.1 Unit tests

- Reflectance normalization.
- NaN handling.
- Band ordering.
- NDVI formula and masks.
- Transform scaling by factor four.
- Display stretching does not mutate raw arrays.

### 10.2 Integration tests

- Sample to completed job.
- Upload to output GeoTIFF.
- Reference-based metrics.
- Missing-reference behavior.
- Failed inference recovery.
- Cached fallback labeling.

### 10.3 UI tests

- Keyboard operation of slider.
- Loading and failure states.
- Metrics hidden or unavailable without reference.
- Download actions.
- Reduced-motion behavior.

## 11. Traceability

| Product goal | Requirements |
| --- | --- |
| Real 4x enhancement | FR-030 to FR-036 |
| Geospatial consistency | FR-023, FR-040 to FR-044 |
| Honest validation | FR-060 to FR-065 |
| Crop utility | FR-070 to FR-074 |
| Offline demonstration | FR-090 to FR-093, NFR-010 |
| User-friendly workflow | NFR-020 to NFR-024 |

## 12. Final MVP exit condition

The release is eligible for the internal SIH presentation only when the urban or crop sample completes end-to-end, the comparison renders, the 2.5 m GeoTIFF downloads, NDVI works, and no unavailable metric is represented as a measured result.

