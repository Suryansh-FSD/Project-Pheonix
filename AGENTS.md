# GeoSR Multi-Agent Operating Rules & Governance

> Persistent rules for all autonomous agents, workers, and orchestrators working on the GeoSR SIH MVP.

## 1. Source of Truth & Authority
- The six documentation specifications (`PRD.md`, `SRS.md`, `ARCHITECTURE.md`, `TECH_STACK.md`, `UI_UX.md`, `DEVELOPMENT_PLAN.md`) are the immutable source of truth.
- **Antigravity** is the sole architect, reviewer, and merge authority.
- Subordinate workers cannot approve, merge, or change requirements, frozen schemas, or scope.

## 2. Worktree & Path Ownership
- Workers must operate strictly inside their assigned Git worktree and edit ONLY their assigned owned paths.
- Edits outside owned paths will trigger immediate rejection and triage logging.
- Shared contracts (`backend/app/core/schemas.py`, `frontend/src/types/api.ts`) and root configurations are owned exclusively by Antigravity.

## 3. Scientific Honesty & Data Integrity
- **No Fabricated Metrics**: Never display simulated or invented PSNR, SSIM, or reconstruction values.
- **Validation Rules**: PSNR and SSIM are calculated ONLY when an aligned high-resolution reference exists. If no reference is available, report `reference_available: false` and display `Reference unavailable`.
- **NDVI Rules**: Analytical NDVI must be computed strictly from raw enhanced B08 (NIR) and B04 (Red) reflectance values with an epsilon-protected denominator. Never compute NDVI from RGB preview images.
- **Cache Semantics**: Cached results must be explicitly labeled `Cached Result`. Arbitrary file uploads can never use or fall back to cached results. A failed live inference remains `failed`.

## 4. MVP Dimensional Constraints
- **Input**: Exactly four-band georeferenced GeoTIFF in `B04, B03, B02, B08` order with shape `[4, 128, 128]` at 10 m resolution.
- **Output**: Exactly four-band GeoTIFF with shape `[4, 512, 512]` at 2.5 m resolution.
- **Geospatial Preservation**: Preserve source CRS, geographic bounds, origin, nodata, and scaled affine transform (pixel size divided by 4).

## 5. Security, Secrets & Asset Governance
- Never commit secrets, API keys, tokens, passwords, or personal absolute paths.
- Never commit model weights (`.pt`, `.pth`, `.onnx`), generated job outputs, or raw restricted imagery to Git.
- Dataset licensing must be verified; unverified sources remain labeled `pending_verification`.

## 6. Execution & Verification Commands
- **Backend (Python 3.11 with uv)**:
  - Lock & Sync: `cd backend && uv lock && uv sync --extra dev`
  - Test: `cd backend && uv run pytest`
  - Dev Server: `cd backend && uv run uvicorn app.main:app --reload`
- **Frontend (pnpm)**:
  - Install: `cd frontend && npx pnpm install --frozen-lockfile`
  - Test: `cd frontend && npx pnpm test`
  - Build: `cd frontend && npx pnpm build`

## 7. Self-Improvement & Repair Limits
- Per work package: 1 initial attempt + maximum 2 minimal repair loops.
- No feature expansion during repair.
- Record every finding in `agent-reports/IMPROVEMENT_LOG.md`.
- Antigravity performs final validation and integration.
