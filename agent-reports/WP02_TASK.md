# WP-02 Task Contract: Frontend Shell & Workflow UI

## Metadata
- **Target Branch**: `agent/wp-02-ui`
- **Assigned Worker**: Native Frontend Agent (Sonnet)
- **Worktree**: `/Users/suryanshdixit/Desktop/VyomSight-worktrees/wp02-ui`
- **Applicable Requirements**: `FR-002`, `FR-003`, `FR-050`–`FR-053`, `FR-062`, `FR-065`, `FR-093`, `NFR-001`, `NFR-004`, `NFR-020`–`NFR-023`
- **Timebox**: 60 minutes

## Owned Paths (Strict Allowlist)
- `frontend/src/**` (EXCEPT `frontend/src/types/api.ts`)
- `frontend/components.json`
- `frontend/index.html`
- `frontend/src/tests/**`

## Forbidden Paths (Strict Blocklist)
- `frontend/src/types/api.ts` (Frozen contract owned by Antigravity)
- `backend/**`
- `agent-reports/**`
- `scripts/**`
- Root configurations and lockfiles

## Core Deliverables
1. **Four-Step Guided Workflow**:
   - `Select Image` → `Enhance` → `Analyze` → `Export`
   - Progress stepper visible at top of dashboard.
2. **Select Image Screen**:
   - Bundled sample cards (Spain Crops, Spain Urban) fetched from `GET /api/samples`.
   - GeoTIFF upload dropzone with band expectation guide (`B04, B03, B02, B08`).
   - Disables Enhance button until valid input is selected and backend health probe is ready.
3. **Enhance & Comparison Screen**:
   - Primary `Enhance Image` action submitting to `POST /api/enhance`.
   - Before/After split image comparison slider with keyboard accessibility.
   - Satellite layer switcher (`Natural Color`, `Vegetation`, `Infrared`).
   - Quality & Trust panel displaying `PSNR` and `SSIM` only when `reference_available === true`, displaying `Reference unavailable` otherwise (no fabricated numbers).
   - Display prominent `Cached Result` badge when `cached === true`.
4. **Simple vs. Expert Mode Toggle**:
   - Simple Mode: plain-language labels, essential summary pills.
   - Expert Mode: raw metadata, CRS, resolution, model provenance, and diagnostic metrics.

## Acceptance Criteria & Tests
- `npx pnpm --dir frontend test` passes with zero errors.
- `npx pnpm --dir frontend build` compiles clean production bundle without type errors.
- All interactive controls adhere to WCAG 2.1 AA focus rings and keyboard navigation.
