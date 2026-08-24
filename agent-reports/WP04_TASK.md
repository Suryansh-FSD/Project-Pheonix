# WP-04 Task Contract: SEN2SRLite Adapter & Raster Pipeline

## Metadata
- **Target Branch**: `agent/wp-04-geoml`
- **Assigned Worker**: Codex CLI Worker
- **Worktree**: `/Users/suryanshdixit/Desktop/VyomSight-worktrees/wp04-geoml`
- **Applicable Requirements**: `FR-012`, `FR-013`, `FR-020`–`FR-024`, `FR-030`–`FR-033`, `FR-040`–`FR-044`, `NFR-002`, `NFR-003`, `NFR-041`, `NFR-042`
- **Timebox**: Focused 90-minute maximum timebox

## Owned Paths (Strict Allowlist)
- `backend/app/model/**`
- `backend/app/processing/**`
- `backend/tests/test_raster.py`

## Forbidden Paths (Strict Blocklist)
- `scripts/download_weights.py` (Owned by Antigravity)
- `scripts/stage_demo_data.py` (Owned by Antigravity)
- `backend/app/core/schemas.py` (Frozen contract owned by Antigravity)
- `backend/app/api/**`
- `backend/app/jobs/**`
- `frontend/**`
- Root configurations and lockfiles

## Core Deliverables
1. **SEN2SRLite Model Adapter (`backend/app/model/adapter.py`)**:
   - Wrap `sen2sr` / `mlstac` model for `NonReference_RGBN_x4`.
   - Implement `SuperResolutionModel`:
     - `load_model(weights_path: Optional[Path]) -> bool`
     - `is_ready() -> bool`
     - `enhance(rgbn_tensor: torch.Tensor) -> torch.Tensor` (input `[1, 4, 128, 128]` -> output `[1, 4, 512, 512]`)
   - Auto-detect CUDA; cleanly fall back to CPU.
2. **GeoTIFF Raster Processor (`backend/app/processing/raster.py`)**:
   - `validate_input(file_path: Path) -> RasterValidationResult`:
     - Assert 4 bands (B04, B03, B02, B08).
     - Assert dimensions are exactly 128×128 (raise `INVALID_DIMENSIONS` if not).
     - Assert valid CRS and Affine transform exist.
   - `normalize_reflectance(raw_data: np.ndarray) -> np.ndarray`:
     - Clean NaN/Inf values.
     - Normalize Sentinel-2 L2A raw reflectance (0-10000) to model input range.
   - `write_super_resolved_geotiff(output_path: Path, sr_array: np.ndarray, source_profile: dict) -> Path`:
     - Scale affine transform: divide pixel size terms by 4.0.
     - Preserve source CRS, origin, bounds, and write band descriptions (`B04 Red`, `B03 Green`, `B02 Blue`, `B08 NIR`).
   - `generate_rgb_preview(array_4band: np.ndarray, output_png: Path) -> Path`:
     - Extract RGB bands (B04, B03, B02).
     - Percentile clip (2% - 98%) and stretch to 8-bit RGB PNG preview for UI display without altering analytical raster values.

## Acceptance Criteria & Tests
- `backend/.venv/bin/pytest backend/tests/test_raster.py` passes 100%.
- Verified that 128×128 GeoTIFF produces valid 512×512 GeoTIFF covering the exact same geographic bounds.
- No interpolation substituted as AI super-resolution.
