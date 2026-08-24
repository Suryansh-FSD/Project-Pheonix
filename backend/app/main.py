"""
GeoSR FastAPI Application Entry Point
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

# Strict CORS origin resolution
environment = os.environ.get("ENVIRONMENT", "development").lower()
cors_origins_env = os.environ.get("CORS_ORIGINS", "")

if cors_origins_env:
    allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
elif environment == "development":
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
else:
    # Production without CORS_ORIGINS configured: strictly reject all cross-origin requests
    allowed_origins = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True if allowed_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
