"""
GeoSR Demo Data Staging Script
Notice: Active release is upload-only live inference.
Unverified sample claims and redistributions are disabled.
Owned exclusively by Antigravity.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
METADATA_FILE = DATA_DIR / "metadata.json"


def stage_demo_metadata():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    metadata = {
        "samples": []
    }

    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"Staged clean demo metadata to: {METADATA_FILE}")
    return True


if __name__ == "__main__":
    stage_demo_metadata()
