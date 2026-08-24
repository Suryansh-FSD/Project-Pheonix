# WP-03 Task Contract: FastAPI Routes & In-Memory Job Lifecycle

## Metadata
- **Target Branch**: `agent/wp-03-api`
- **Assigned Worker**: Native Backend Agent (Sonnet)
- **Worktree**: `/Users/suryanshdixit/Desktop/VyomSight-worktrees/wp03-api`
- **Applicable Requirements**: `FR-001`, `FR-010`, `FR-011`, `FR-014`, `FR-015`, `FR-034`–`FR-036`, `NFR-011`–`NFR-013`, `NFR-030`–`NFR-034`
- **Timebox**: 60 minutes

## Owned Paths (Strict Allowlist)
- `backend/app/api/**`
- `backend/app/jobs/**`
- `backend/app/main.py`
- `backend/tests/test_api.py`
- `backend/tests/test_jobs.py`

## Forbidden Paths (Strict Blocklist)
- `backend/app/core/schemas.py` (Frozen contract owned by Antigravity)
- `backend/app/model/**` (Owned by WP-04)
- `backend/app/processing/**` (Owned by WP-04)
- `backend/app/analysis/**` (Owned by WP-05)
- `backend/app/reporting/**` (Owned by WP-06)
- `frontend/**`
- Root configurations and lockfiles

## Core Deliverables
1. **In-Memory Job Manager**:
   - Manages state machine: `queued` → `running` → `completed` / `failed` / `cached`.
   - Concurrency lock (`asyncio.Lock`) limiting active live inference to 1 job.
   - Unique collision-safe job directory under `outputs/jobs/{job_id}`.
2. **API Routes**:
   - `GET /api/health`: Expose dynamic readiness, device probe, and frozen model provenance.
   - `GET /api/samples`: Read and return verified sample metadata from `data/demo/metadata.json`.
   - `POST /api/enhance`: Validate `execution_mode: "live" | "cached"`.
     - Live: Reject if dimensions != 128x128 with `INVALID_DIMENSIONS`. Run inference task in background.
     - Cached: Require valid `sample_id`; return cached record with `cached: true`. Reject arbitrary upload with `INVALID_REQUEST`.
   - `GET /api/jobs/{job_id}`: Poll current job status, progress, metrics, and error detail.
3. **Structured Error Handling**:
   - Return typed `ErrorDetail` objects for domain exceptions with proper HTTP status codes.

## Acceptance Criteria & Tests
- `backend/.venv/bin/pytest backend/tests/test_api.py backend/tests/test_jobs.py` passes 100%.
- Job transitions adhere strictly to state machine with zero state leakage.
