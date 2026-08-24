"""
GeoSR FastAPI Application Entry Point
Owned by recovery/backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="GeoSR Super-Resolution API",
    description="Sentinel-2 4-Band 4x Super-Resolution Geospatial Service (10 m -> 2.5 m)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
