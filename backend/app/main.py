"""
GeoSR FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.schemas import HealthResponse, ModelProvenance

app = FastAPI(
    title="GeoSR Super-Resolution API",
    version="1.0.0",
    description="Local-first geospatial super-resolution mapping for Sentinel-2 10m to 2.5m.",
)

# CORS restricted to local development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """
    Service health and model readiness probe.
    """
    return HealthResponse(
        status="ok",
        backend_ready=True,
        model_ready=False,
        model_provenance=ModelProvenance(),
        device="unavailable",
        version="1.0.0",
    )
