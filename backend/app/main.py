"""
GeoSR FastAPI Application Entry Point
Owned by final/backend.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="GeoSR Super-Resolution API",
    description="Sentinel-2 4-Band 4x Super-Resolution Geospatial Service (10 m -> 2.5 m)",
    version="1.0.0",
)

# Configurable CORS origins for Render deployment
cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
