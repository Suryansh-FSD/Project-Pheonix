# GeoSR Product Requirements Document

## 1. Document control

| Field | Value |
| --- | --- |
| Product | GeoSR |
| Problem statement | SIH 2026 PS 26142 |
| Title | Deep Learning Based Super Resolution Mapping from Medium Resolution Satellite Imagery |
| Version | 1.0 |
| Status | Internal SIH MVP baseline |
| Primary target | Sentinel-2 RGB+NIR, 10 m to 2.5 m |
| Cost constraint | Zero-cost, open-source, local-first |

Related documents: [SRS](SRS.md), [Architecture](ARCHITECTURE.md), [Tech Stack](TECH_STACK.md), [UI/UX](UI_UX.md), and [Development Plan](DEVELOPMENT_PLAN.md).

## 2. Product summary

GeoSR is a local-first geospatial application that converts 10 m Sentinel-2 imagery into a 2.5 m super-resolved, analysis-ready product. It preserves the source coordinate reference system and spectral bands, allows users to compare the original and enhanced imagery, reports only defensible validation results, calculates NDVI from the enhanced red and near-infrared bands, and exports a georeferenced GeoTIFF.

The internal SIH MVP uses ESA SEN2SRLite NonReference_RGBN_x4 as a pretrained baseline. It is not presented as a model trained by the team. Future versions may train or fine-tune a team-owned model on geographically separated paired datasets.

## 3. Problem

Sentinel-2 provides broad coverage and frequent revisit capability, but its 10 m imagery cannot clearly resolve many narrow roads, small structures, field boundaries, water edges, or localized changes. Standard interpolation increases pixel count but does not add learned spatial detail. Generic image enhancers can create visually pleasing but scientifically unreliable features.

Users need a workflow that improves spatial interpretability while preserving:

- Geospatial alignment and metadata.
- Spectral relationships between RGB and NIR bands.
- Traceability from input to output.
- Honest validation and uncertainty/error communication.

## 4. Product vision

Provide an accessible, trustworthy super-resolution workspace that helps non-specialist users turn freely available Sentinel-2 imagery into more interpretable geospatial products without paid APIs or proprietary infrastructure.

## 5. Target users

### 5.1 Primary users

- Remote-sensing analysts evaluating super-resolution outputs.
- Agriculture teams examining vegetation and field-level patterns.
- Urban planners examining roads, built-up areas, and land-use boundaries.
- Disaster-response teams comparing affected areas.
- SIH evaluators assessing technical feasibility, usability, and impact.

### 5.2 MVP user persona

A student or analyst with a GeoTIFF or bundled Sentinel-2 sample who wants to generate and visually inspect a 2.5 m output without configuring a research pipeline.

## 6. Goals

### 6.1 MVP goals

1. Run real 4x inference on a bundled RGB+NIR Sentinel-2 sample.
2. Accept a compatible four-band GeoTIFF.
3. Preserve CRS and produce a correctly transformed 2.5 m GeoTIFF.
4. Provide a responsive before/after comparison.
5. Calculate PSNR and SSIM only when an aligned high-resolution reference exists.
6. Produce an NDVI layer using enhanced NIR and red bands.
7. Download the enhanced GeoTIFF, preview, and summary report.
8. Work locally without paid services or internet during the presentation.

### 6.2 Post-MVP goals

- Live Copernicus Data Space search and acquisition.
- Large-area tiled processing with overlap blending.
- Formal model uncertainty estimation.
- Crop-boundary, urban-feature, and disaster-analysis modules.
- Multi-date change detection.
- Team-owned training and evaluation pipeline.

## 7. Non-goals for the internal MVP

- Weather or climate forecasting.
- Pollution prediction.
- Recovering ground information under opaque clouds.
- Authentication, billing, collaboration, or persistent user accounts.
- Processing complete Sentinel-2 tiles during the live demo.
- Claiming generated details are directly observed ground truth.
- Claiming the pretrained model was trained by the team.

## 8. Core user journey

1. User opens GeoSR and selects a bundled sample or uploads a valid GeoTIFF.
2. GeoSR validates bands, shape, metadata, and file size.
3. User starts enhancement.
4. GeoSR normalizes reflectance and runs 4x SEN2SRLite inference.
5. GeoSR creates a preview and georeferenced output.
6. User drags a slider to compare 10 m and 2.5 m imagery.
7. If a reference exists, GeoSR shows measured validation metrics.
8. User opens the crop analysis tab to inspect NDVI.
9. User downloads GeoTIFF, NDVI preview, or report.

## 9. Product requirements

### 9.1 Input

- Support bundled urban and crop samples from OpenSR Test.
- Support four-band GeoTIFF uploads in B04, B03, B02, B08 order.
- Display the expected band order before upload.
- Reject unsupported files with a clear correction message.
- Limit MVP uploads to a configurable safe size.

### 9.2 Enhancement

- Use SEN2SRLite NonReference_RGBN_x4.
- Normalize Sentinel-2 reflectance values consistently.
- Replace NaN and infinite values safely.
- Use CPU when CUDA is unavailable.
- Preserve the original raw values separately from display stretching.
- Record processing time and model identifier.

### 9.3 Visualization

- Show input and output resolution.
- Provide an accessible before/after slider.
- Support natural-color, vegetation, and infrared views when bands allow.
- Show processing, success, cached-result, and failure states.
- Avoid invented quality numbers.

### 9.4 Validation

- Compute PSNR and SSIM only with an aligned high-resolution reference.
- Mark metrics unavailable for arbitrary uploads without a reference.
- Provide a reconstruction-consistency check by reducing the output back to source resolution.
- Distinguish validation error, consistency warning, and formal uncertainty.

### 9.5 Analysis

- Calculate NDVI from enhanced B08 and B04 bands.
- Display an NDVI preview and vegetation classes.
- Report green-cover percentage using a documented threshold.
- Preserve raw NDVI values for export.

### 9.6 Export

- Export the four-band 2.5 m GeoTIFF.
- Export RGB and NDVI previews.
- Generate a PDF report containing metadata, model name, processing time, available metrics, and comparison images.

## 10. MVP priorities

| Priority | Requirement |
| --- | --- |
| P0 | Bundled sample loads |
| P0 | Real 4x inference completes |
| P0 | Before/after comparison works |
| P0 | Output GeoTIFF preserves CRS and 2.5 m transform |
| P0 | No fabricated metrics |
| P1 | HR-reference PSNR and SSIM |
| P1 | NDVI and green-cover output |
| P1 | Downloadable GeoTIFF |
| P2 | PDF report |
| P2 | Map location preview |
| Deferred | Change detection, field boundaries, urban detection, live Copernicus |

## 11. Success metrics

### 11.1 Demonstration success

- The complete sample workflow finishes without internet.
- A 128 by 128 source patch produces a 512 by 512 output.
- GeoTIFF pixel size changes from 10 m to 2.5 m while geographic extent remains consistent.
- The user reaches a comparison result in no more than three primary actions.
- All failed inputs return actionable messages rather than stack traces.

### 11.2 Technical success

- Automated tests confirm input validation, normalization, NDVI, transform scaling, and output shape.
- Reference-based metrics are reproducible for bundled samples.
- Cached fallback results are clearly marked as cached.
- No secrets, paid keys, or external analytics are required.

## 12. Assumptions and constraints

- MVP inference operates on small patches to keep CPU execution practical.
- Four-band inputs use reflectance values compatible with Sentinel-2 L2A normalization.
- Full scientific validation requires aligned high-resolution references.
- Free cloud GPU availability is not guaranteed; local execution is the baseline.
- Componentry is used only for optional visual polish; functional controls remain accessible without animation.

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Model installation fails | Demo blocked | Freeze dependencies and bundle cached sample outputs |
| CPU inference is slow | Poor demo flow | Restrict patch size, preload model, precompute fallback |
| Invalid band order | Incorrect colors/NDVI | Validate metadata and require explicit mapping |
| Output invents detail | Trust failure | Show consistency/error information and limitations |
| Metrics are misunderstood | False scientific claim | Show reference availability and metric definitions |
| Live data access fails | Demo interruption | Bundle local samples; defer Copernicus integration |
| UI animations reduce performance | Sluggish interaction | Respect reduced motion and avoid heavy WebGL effects |

## 14. Acceptance criteria

The MVP is accepted when:

- Health, sample, enhance, job-status, NDVI, and download APIs work locally.
- At least one urban and one agricultural sample are bundled.
- SEN2SRLite loads once and produces a real 4x output.
- The browser shows a working before/after slider.
- PSNR and SSIM appear only for the paired samples.
- NDVI is calculated from raw enhanced red and NIR bands.
- The enhanced GeoTIFF downloads with correct CRS, extent, and 2.5 m transform.
- Demo Mode can fall back to a clearly labeled cached result.

## 15. Product principles

1. Scientific honesty over visual drama.
2. One obvious next action for first-time users.
3. Local reliability over fragile online dependencies.
4. Raw analytical data remains separate from display styling.
5. Every metric must state what reference or assumption produced it.

