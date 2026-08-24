# GeoSR Development Plan

## 1. Delivery strategy

The project is delivered in two tracks:

1. Internal SIH MVP: a small, reliable local demonstration.
2. Competition-ready system: broader validation, uncertainty, live acquisition, and downstream applications.

The MVP is considered successful only when one real 10 m to 2.5 m pipeline works end-to-end. Additional screens do not compensate for a broken core.

## 2. Immediate MVP scope

### Must work

- Local frontend and backend.
- Model health check.
- One crop and one urban bundled sample.
- SEN2SRLite RGBN x4 inference.
- Before/after slider.
- Correct GeoTIFF transform and download.
- PSNR and SSIM for paired samples.
- NDVI and green-cover preview.
- Cached fallback clearly labeled.

### May be present as disabled roadmap items

- Change detection.
- Field-boundary extraction.
- Urban-feature extraction.
- Disaster analysis.
- Live Copernicus acquisition.
- Formal uncertainty.

### Must not be claimed

- Team-trained model, unless training actually occurs.
- Live inference when a cache was used.
- Ground-truth accuracy without a reference.
- Climate, weather, or pollution prediction.

## 3. Internal demo build sequence

### Stage 0 — Freeze and verify

Tasks:

- Confirm Python and Node versions.
- Confirm disk and memory availability.
- Select package managers: uv and pnpm.
- Create the repository structure.
- Add environment and start scripts.

Exit criteria:

- Frontend and backend health pages run locally.

### Stage 1 — Demonstration data

Tasks:

- Install OpenSR Test.
- Select one Spain Crops and one Spain Urban x4 sample.
- Record attribution and dataset identifiers.
- Export stable LR and HR patches for the application.
- Verify RGB+NIR band order and numerical range.

Exit criteria:

- Each sample has LR, HR, metadata, thumbnail, and license note.

### Stage 2 — Model spike

Tasks:

- Install sen2sr and mlstac.
- Download SEN2SRLite NonReference_RGBN_x4.
- Load model on CPU.
- Run a single 128 by 128 RGBN tensor.
- Verify 512 by 512 output and finite values.
- Measure runtime and memory.

Go/no-go gate:

- If the model cannot run within the allocated integration window, preserve the error, use the official precomputed result for UI development, and continue model debugging separately. Do not substitute bicubic and call it AI.

Exit criteria:

- A script produces an SR array from a real sample.

### Stage 3 — Geospatial pipeline

Tasks:

- Read GeoTIFF with Rasterio.
- Validate CRS, transform, bands and values.
- Normalize and infer.
- Create natural-color previews.
- Write four-band 2.5 m GeoTIFF.
- Verify extent and transform.

Exit criteria:

- Input and output open in a GIS/raster checker and cover the same location.

### Stage 4 — FastAPI

Tasks:

- Implement health and sample routes.
- Implement enhance job creation.
- Add in-memory job state.
- Add model adapter and processing service.
- Add download route.
- Add typed domain errors.

Exit criteria:

- A request moves from queued to completed and returns valid files.

### Stage 5 — Dashboard

Tasks:

- Build the shell and four-step workflow.
- Implement sample selection.
- Connect readiness state.
- Implement before/after slider.
- Add quality panel with honest availability states.
- Add loading, error, success and cached states.

Exit criteria:

- A user can select, enhance and compare without opening developer tools.

### Stage 6 — Validation and NDVI

Tasks:

- Calculate PSNR and SSIM for paired samples.
- Add reference_available field.
- Implement consistency-only response for uploads without HR.
- Calculate NDVI from enhanced B08 and B04.
- Create NDVI preview and green-cover summary.

Exit criteria:

- Paired sample metrics are reproducible and unavailable metrics remain unavailable.

### Stage 7 — Export and hardening

Tasks:

- Download enhanced GeoTIFF.
- Download previews.
- Generate PDF report.
- Bundle cached sample results.
- Add offline check.
- Add error boundaries.
- Lock dependencies.
- Record a backup demo.

Exit criteria:

- Full scripted demonstration succeeds twice after a fresh restart and with internet disabled.

## 4. Suggested one-night timebox

| Timebox | Outcome |
| --- | --- |
| 0:00–0:45 | Repository and health checks |
| 0:45–1:45 | Samples and model spike |
| 1:45–3:00 | GeoTIFF inference pipeline |
| 3:00–4:00 | FastAPI job flow |
| 4:00–5:30 | Dashboard and comparison |
| 5:30–6:15 | NDVI and reference metrics |
| 6:15–7:00 | Downloads, cache and failure states |
| 7:00–8:00 | Testing, slides, recording and rehearsal |

If the model spike fails after its fixed timebox, continue the UI with cached model output and keep the failure honest.

## 5. Coding-agent work packages

Give the coding agent one package at a time and require verification before the next.

### WP-01 Scaffold

Deliver:

- Vite React TypeScript frontend.
- FastAPI backend.
- Shared development instructions.
- Health integration.

Tests:

- Frontend build.
- Backend health test.

### WP-02 UI shell

Deliver:

- Dashboard matching UI_UX.md.
- Accessible navigation and workflow.
- Empty and loading states.

Tests:

- Keyboard navigation.
- Reduced-motion behavior.
- No fabricated values.

### WP-03 Model adapter

Deliver:

- SEN2SRLite loader.
- CPU device fallback.
- Input/output shape validation.
- Warm-up and readiness.

Tests:

- Known tensor produces finite 4x output.

### WP-04 Raster pipeline

Deliver:

- GeoTIFF validation.
- Reflectance normalization.
- CRS and transform preservation.
- Preview generation.

Tests:

- Output size and transform.
- Bounds tolerance.
- Band descriptions.

### WP-05 API jobs

Deliver:

- Enhance endpoint.
- Status polling.
- Collision-safe job directories.
- Safe failures.

Tests:

- Success, invalid input, failed job and cache states.

### WP-06 Validation and analysis

Deliver:

- PSNR and SSIM with reference.
- Explicit no-reference behavior.
- NDVI and green-cover output.

Tests:

- Formula fixtures.
- Invalid masks.
- Reference flag.

### WP-07 Export and demo

Deliver:

- GeoTIFF and PDF downloads.
- Bundled samples.
- Cached results.
- Offline runbook.

Tests:

- Downloads open.
- Cache is labeled.
- Demo succeeds offline.

## 6. Definition of done

A work package is complete when:

- Code is formatted and typed.
- Relevant tests pass.
- Error states are handled.
- README or documentation is updated.
- No placeholder is represented as working.
- No paid dependency is introduced.
- The feature works after restarting both local services.

## 7. Test plan

### 7.1 Automated

- Backend unit tests for normalization, NDVI, transforms, band order and metrics.
- API tests for health, samples, enhance, job status and downloads.
- Frontend tests for states, accessibility and metric availability.
- Production frontend build.

### 7.2 Manual scientific checks

- Inspect original, SR and HR side by side.
- Check boundaries for shifts.
- Check tile seams.
- Check water and urban edges for invented structures.
- Confirm NDVI uses raw bands.
- Confirm output bounds and CRS.

### 7.3 Demo checks

- Restart laptop or services.
- Disconnect internet.
- Run crop sample.
- Run urban sample or cached backup.
- Download GeoTIFF.
- Open report.
- Play recorded fallback if presentation hardware fails.

## 8. Risk gates

| Gate | Deadline | Decision |
| --- | --- | --- |
| Model loads | End of model spike | Continue live inference or use honest cached result |
| Output georeferences correctly | Before UI integration | Fix pipeline; do not hide error in preview |
| API completes a sample | Before analysis features | Freeze new UI work until fixed |
| NDVI is correct | Before presentation | Remove NDVI claim if band workflow is invalid |
| Offline rehearsal passes twice | Final check | Presentation-ready |

## 9. Post-internal roadmap

### Phase 1 — Trustworthy baseline

- Expand OpenSR Test evaluation.
- Add bicubic and model comparisons.
- Add ERGAS, SAM, band-wise errors and downstream metrics.
- Document hallucination and omission cases.

### Phase 2 — Team model

- Build geographically separated paired training sets.
- Implement reconstruction-focused CNN or transformer baseline.
- Compare with SEN2SRLite.
- Add experiment tracking using local open-source tooling.

### Phase 3 — Uncertainty

- Add a method that produces calibrated uncertainty.
- Evaluate reliability against held-out HR references.
- Separate cloud, input-quality, reconstruction-error, and epistemic uncertainty.

### Phase 4 — Downstream applications

- Field-boundary or vegetation analysis.
- Road/building or urban feature extraction.
- Flood or disaster change analysis.
- Measure whether SR improves downstream F1 or IoU.

### Phase 5 — Live geospatial platform

- Copernicus Data Space search.
- AOI and date selection.
- Cloud filtering.
- Large-area tiled processing.
- PostGIS and job queue only when operational need justifies them.

## 10. Six-week competition plan

| Week | Goal |
| --- | --- |
| 1 | Data audit, baselines and evaluation protocol |
| 2 | Team model baseline and geospatial pipeline |
| 3 | Model improvement and spectral consistency |
| 4 | Uncertainty/error framework and downstream task |
| 5 | Live acquisition, tiled inference and application hardening |
| 6 | Unseen-region testing, presentation, documentation and rehearsal |

## 11. Presentation plan

Recommended 90-second flow:

1. State why 10 m imagery misses small features.
2. Select the crop sample.
3. Press Enhance Image.
4. Drag the comparison slider.
5. Show that metrics use an aligned reference.
6. Open NDVI and green-cover analysis.
7. Download the 2.5 m GeoTIFF.
8. State the limitation: SR estimates detail and must be accompanied by validation and uncertainty.

## 12. Final stop rule

Do not add another feature when any P0 item is broken. A narrow working system with defensible output is stronger than a broad dashboard filled with simulated capabilities.

