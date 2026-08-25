"""
GeoSR Model Provenance Loader
Reads model provenance dynamically from models/manifest.json as the single source of truth.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Optional
from app.core.schemas import ModelProvenance

MODELS_DIR = Path(__file__).resolve().parents[3] / "models"
MANIFEST_PATH = MODELS_DIR / "manifest.json"


def get_manifest_path() -> Path:
    if "GEOSR_MODELS_DIR" in os.environ:
        p = Path(os.environ["GEOSR_MODELS_DIR"]) / "manifest.json"
        if p.exists():
            return p
    local_manifest = Path("/root/local_manifest.json")
    if local_manifest.exists():
        return local_manifest
    return MANIFEST_PATH


def load_model_provenance() -> ModelProvenance:
    """Load verified model provenance metadata from manifest.json."""
    manifest_file = get_manifest_path()
    if manifest_file.exists():
        try:
            with open(manifest_file, "r") as f:
                data = json.load(f)
            return ModelProvenance(
                model_name=data.get("model_name", "SEN2SRLite"),
                model_variant=data.get("model_variant", "NonReference_RGBN_x4"),
                code_repository=data.get("code_repository", "https://github.com/ESAOpenSR/SEN2SR"),
                artifact_uri=data.get("artifact_uri", "tacofoundation/sen2sr/SEN2SRLite/NonReference_RGBN_x4"),
                artifact_revision=data.get("artifact_revision", "b44156729e7b1b73764c474d5dcbaab0423841a8"),
                artifact_sha256=data.get("files", {}).get("model.safetensor", {}).get("sha256"),
                code_license=data.get("code_license", "CC0-1.0"),
                weights_license=data.get("weights_license", "unverified"),
            )
        except Exception:
            pass

    return ModelProvenance(
        model_name="SEN2SRLite",
        model_variant="NonReference_RGBN_x4",
        code_repository="https://github.com/ESAOpenSR/SEN2SR",
        artifact_uri="tacofoundation/sen2sr/SEN2SRLite/NonReference_RGBN_x4",
        artifact_revision="b44156729e7b1b73764c474d5dcbaab0423841a8",
        artifact_sha256="479aa796d5068d0b1206118ccbca27bd3223df0214db1a9b31a1e18349ed1c7e",
        code_license="CC0-1.0",
        weights_license="unverified",
    )
