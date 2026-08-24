# GeoSR System Architecture

## 1. Architecture objectives

GeoSR uses a local-first, two-process architecture:

- A React client provides the user workflow and visualization.
- A FastAPI service owns all geospatial processing, model inference, analysis, and export.

The architecture prioritizes an offline internal demonstration, scientific traceability, and the ability to replace the pretrained MVP model later without rewriting the user interface.

## 2. Design principles

1. Local execution is the reliable baseline.
2. The browser never performs authoritative geospatial processing.
3. Raw reflectance arrays remain separate from display previews.
4. Model inference is accessed through an adapter.
5. Metrics declare whether a high-resolution reference exists.
6. The demo can use cached outputs, but cached results are always labeled.
7. Paid services, databases, queues, and authentication are excluded from the MVP.

## 3. System context

~~~mermaid
flowchart TD
    User["Analyst or SIH evaluator"] --> UI["GeoSR web client"]
    UI --> API["GeoSR FastAPI service"]
    API --> Model["SEN2SRLite model"]
    API --> Files["Local samples and job files"]
    API -. later .-> CDSE["Copernicus Data Space"]
~~~

## 4. Container architecture

~~~mermaid
flowchart TD
    subgraph Client["React client"]
        Workflow["Guided workflow"]
        Viewer["Before/after viewer"]
        AnalysisUI["NDVI and quality panels"]
    end

    subgraph Server["FastAPI service"]
        Routes["API routes"]
        Jobs["In-memory job manager"]
        Raster["Raster processing"]
        Inference["Model adapter"]
        Reports["Export service"]
    end

    subgraph Local["Local resources"]
        Weights["Pinned model weights"]
        Samples["Demo LR, HR and cached SR"]
        Outputs["Job outputs"]
    end

    Client --> Routes
    Routes --> Jobs
    Jobs --> Raster
    Raster --> Inference
    Inference --> Reports
    Inference --> Weights
    Raster --> Samples
    Reports --> Outputs
~~~

## 5. Repository layout

~~~text
geosr/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── enhance/
│   │   │   ├── comparison/
│   │   │   ├── validation/
│   │   │   ├── analysis/
│   │   │   └── exports/
│   │   ├── services/
│   │   ├── types/
│   │   └── styles/
│   ├── components.json
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── jobs/
│   │   ├── model/
│   │   ├── processing/
│   │   ├── reporting/
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
├── data/
│   └── demo/
├── models/
├── outputs/
├── scripts/
└── README.md
~~~

## 6. Frontend architecture

### 6.1 Application shell

- Sidebar navigation.
- Simple and Expert mode switch.
- Four-step progress indicator.
- Global backend/model readiness indicator.
- Friendly error boundary.

### 6.2 Feature modules

| Module | Responsibility |
| --- | --- |
| Input selector | Bundled samples, upload and band guidance |
| Enhancement | Starts a job and displays progress |
| Comparison | Before/after slider and view modes |
| Validation | Reference status, PSNR, SSIM, spectral consistency |
| Analysis | NDVI preview and green-cover summary |
| Export | GeoTIFF, preview and report downloads |
| Map | Sample position and later area selection |

### 6.3 State model

The MVP may use React context or a small feature store. It must represent:

- applicationReady
- modelReady
- selectedInput
- activeJob
- jobStatus
- resultMetadata
- availableMetrics
- referenceAvailable
- selectedLayer
- error

Server state should be fetched from API responses rather than duplicated as independent client truth.

### 6.4 Comparison viewer

The viewer renders two aligned preview images in one positioned container. The enhanced layer is clipped using a percentage controlled by an accessible range input. Preview images are derived from the same bounds and dimensions to prevent visual misalignment.

## 7. Backend architecture

### 7.1 API layer

Routes validate HTTP input, call application services, and translate typed domain errors into safe responses. Routes do not contain raster or ML logic.

### 7.2 Job manager

The MVP uses:

- An in-memory dictionary keyed by UUID.
- A single-process background task.
- A concurrency limit of one inference job by default.
- Local job directories beneath outputs/jobs/{job_id}.

Redis and Celery are intentionally excluded. A production version can replace the job manager without changing route contracts.

### 7.3 Model adapter

~~~text
SuperResolutionModel
  load() -> ModelInfo
  is_ready() -> bool
  enhance(rgbn_tensor) -> rgbn_tensor
~~~

The initial adapter wraps SEN2SRLite NonReference_RGBN_x4. The adapter owns device selection, model loading, inference mode, and output-shape verification.

### 7.4 Raster processor

Responsibilities:

- Open and validate GeoTIFF.
- Resolve band order.
- Normalize reflectance.
- Create model tensors.
- Preserve CRS, affine transform, bounds, nodata and source metadata.
- Build 2.5 m output profile.
- Create non-authoritative display previews.

### 7.5 Validation service

Reference-based path:

1. Load aligned HR reference.
2. Harmonize dimensions and valid masks.
3. Calculate PSNR, SSIM and band errors.
4. Return metric definitions and reference identifier.

No-reference path:

1. Downsample SR output to LR dimensions.
2. Compare reconstructed LR bands with original input.
3. Return consistency diagnostics.
4. Explicitly return reference_available=false.

The no-reference path does not claim accuracy or formal uncertainty.

### 7.6 Analysis service

NDVI is computed from raw enhanced values:

~~~text
NDVI = (B08 - B04) / (B08 + B04 + epsilon)
~~~

The service applies the valid-data mask, classifies vegetation for display, calculates the configured green-cover percentage, and writes analytical and preview outputs separately.

### 7.7 Reporting service

The report generator receives immutable job metadata and available results. It never recomputes inference. Reports include:

- Source and output resolution.
- Source CRS and bounds.
- Model identifier and runtime device.
- Processing duration.
- Validation reference status.
- Available metrics.
- Comparison and NDVI previews.
- Known limitations.

## 8. Processing data flow

~~~mermaid
sequenceDiagram
    participant U as User
    participant W as Web client
    participant A as FastAPI
    participant P as Processor
    participant M as SEN2SRLite

    U->>W: Select sample or upload
    W->>A: POST /api/enhance
    A-->>W: Job ID
    A->>P: Validate and normalize
    P->>M: RGBN tensor
    M-->>P: 4x RGBN tensor
    P->>P: GeoTIFF, preview, metrics
    W->>A: Poll job
    A-->>W: Completed result
    W-->>U: Compare, analyze, export
~~~

## 9. Job state machine

~~~mermaid
stateDiagram-v2
    [*] --> Queued
    Queued --> Running
    Running --> Completed
    Running --> Failed
    Queued --> Cached
    Completed --> [*]
    Failed --> [*]
    Cached --> [*]
~~~

Cached is a terminal success state with cached=true. The client must display that distinction.

## 10. Geospatial consistency

Given input transform:

~~~text
| a  b  c |
| d  e  f |
| 0  0  1 |
~~~

For a 4x output, pixel scale terms a, b, d, and e are divided consistently by four while origin and CRS remain aligned. The output width and height are multiplied by four. Bounds must be checked after writing.

Raw output band order is documented and written into band descriptions:

1. B04 Red
2. B03 Green
3. B02 Blue
4. B08 Near Infrared

## 11. Local deployment

### 11.1 Presentation topology

~~~mermaid
flowchart LR
    Browser["Browser :5173"] --> API["FastAPI :8000"]
    API --> Disk["Local model, samples, outputs"]
~~~

The browser, frontend development server, and FastAPI service run on the presentation laptop. No network call is required after dependencies and weights are prepared.

### 11.2 Future deployment

- Static frontend may be deployed to a free static host.
- The inference service may be containerized.
- Public GPU or CPU hosting is optional and not assumed to remain free.
- Copernicus credentials must be server-side secrets when live acquisition is added.

## 12. Failure handling

| Failure | Architectural response |
| --- | --- |
| Model unavailable | Health reports modelReady=false; demo may use labeled cache |
| Invalid GeoTIFF | Validation fails before job creation |
| Out of memory | Job fails safely; lower patch limit is recommended |
| Export error | Inference result remains available; export can retry |
| Frontend refresh | Active in-memory job may be fetched while server lives |
| Server restart | MVP in-memory jobs are lost; bundled samples remain available |

## 13. Security boundaries

- Uploads are data, never executable.
- Filename and path components are generated server-side.
- Output access is restricted to known job identifiers.
- CORS is limited to the local frontend origin.
- Download responses set safe content types and filenames.
- Model weights and sample licenses are documented.

## 14. Architecture decisions

| Decision | Reason |
| --- | --- |
| React plus FastAPI | Strong UI with Python-native ML integration |
| Local-first | Reliable, zero-cost presentation |
| SEN2SRLite | Correct 10 m to 2.5 m domain-specific baseline |
| In-memory jobs | Minimal MVP complexity |
| Four-band GeoTIFF | Supports true-color and NDVI |
| Bundled paired samples | Reproducible validation without live services |
| Separate previews and raw data | Prevent visual stretching from corrupting analysis |

## 15. Evolution path

The architecture permits these replacements:

- In-memory jobs to Redis/Celery or another queue.
- Local files to object storage.
- SEN2SRLite to a team-trained model.
- Bundled inputs to Copernicus acquisition.
- Patch inference to tiled large-area inference.
- Simple consistency diagnostics to calibrated uncertainty.

The API and UI should remain stable while these internal services evolve.

