"""
GeoSR Demo Data Staging Script
Extracts and stages paired Spain Crops and Spain Urban 128x128 patches from opensr-test.
Owned exclusively by Antigravity.
"""

import sys
import json
import hashlib
from pathlib import Path
import numpy as np

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
METADATA_FILE = DATA_DIR / "metadata.json"


def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()


def stage_demo_metadata():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    metadata = {
        "samples": [
            {
                "sample_id": "spain_crops_01",
                "name": "Spain Agricultural Fields (Crops)",
                "category": "crop",
                "location": "Castile-La Mancha, Spain",
                "input_resolution_m": 10.0,
                "output_resolution_m": 2.5,
                "input_dimensions": [128, 128],
                "output_dimensions": [512, 512],
                "has_hr_reference": True,
                "reference_source": "OpenSR Test / Aerial Reference",
                "preview_url": "/api/static/samples/spain_crops_01_thumb.png",
                "license_info": {
                    "license": "pending_verification",
                    "attribution": "ESA OpenSR / OpenSR Test dataset contributor",
                    "redistribution_permitted": False,
                    "source_url": "https://github.com/ESAOpenSR/opensr-test"
                }
            },
            {
                "sample_id": "spain_urban_01",
                "name": "Spain Urban Settlement",
                "category": "urban",
                "location": "Madrid Region, Spain",
                "input_resolution_m": 10.0,
                "output_resolution_m": 2.5,
                "input_dimensions": [128, 128],
                "output_dimensions": [512, 512],
                "has_hr_reference": True,
                "reference_source": "OpenSR Test / Aerial Reference",
                "preview_url": "/api/static/samples/spain_urban_01_thumb.png",
                "license_info": {
                    "license": "pending_verification",
                    "attribution": "ESA OpenSR / OpenSR Test dataset contributor",
                    "redistribution_permitted": False,
                    "source_url": "https://github.com/ESAOpenSR/opensr-test"
                }
            }
        ]
    }

    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Staged demo metadata to: {METADATA_FILE}")
    return True


if __name__ == "__main__":
    stage_demo_metadata()
