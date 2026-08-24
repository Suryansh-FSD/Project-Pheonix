"""
GeoSR Model Weights Download & Verification Script
Model: SEN2SRLite NonReference_RGBN_x4
Repository: https://github.com/ESAOpenSR/SEN2SR
Owned exclusively by Antigravity.
"""

import os
import sys
import json
import hashlib
from pathlib import Path
import mlstac
import torch

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
WEIGHTS_DIR = MODELS_DIR / "weights"
PROVENANCE_FILE = MODELS_DIR / "provenance.json"

MODEL_ID = "tacofoundation/sen2sr/SEN2SRLite/NonReference_RGBN_x4"


def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


def download_and_verify():
    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Loading and staging model from MLSTAC: {MODEL_ID}...")
    try:
        model = mlstac.load(MODEL_ID)
        weights_path = WEIGHTS_DIR / "sen2srlite_nonreference_rgbn_x4.pt"
        torch.save(model.state_dict(), weights_path)
        sha256_hash = compute_sha256(weights_path)
        print(f"Model weights staged successfully to: {weights_path}")
        print(f"SHA-256: {sha256_hash}")

        provenance = {
            "model_name": "SEN2SRLite",
            "model_variant": "NonReference_RGBN_x4",
            "code_repository": "https://github.com/ESAOpenSR/SEN2SR",
            "artifact_uri": MODEL_ID,
            "artifact_local_path": str(weights_path.relative_to(MODELS_DIR.parent)),
            "artifact_sha256": sha256_hash,
            "code_license": "CC0-1.0",
            "weights_license": "unverified",
            "input_bands": ["B04", "B03", "B02", "B08"],
            "input_resolution_m": 10.0,
            "output_resolution_m": 2.5,
            "scale_factor": 4,
            "device_default": "cpu"
        }

        with open(PROVENANCE_FILE, "w") as f:
            json.dump(provenance, f, indent=2)

        print(f"Provenance metadata written to: {PROVENANCE_FILE}")
        return True
    except Exception as e:
        print(f"Model download/staging failed: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    success = download_and_verify()
    sys.exit(0 if success else 1)
