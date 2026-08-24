"""
GeoSR Model Weights Download & Verification Script
Model: SEN2SRLite NonReference_RGBN_x4
Pinned Immutable Hugging Face Revision: b44156729e7b1b73764c474d5dcbaab0423841a8
Owned exclusively by Antigravity.
"""

import os
import sys
import json
import hashlib
import urllib.request
from pathlib import Path
import mlstac

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MANIFEST_FILE = MODELS_DIR / "manifest.json"
MODEL_DIR = MODELS_DIR / "SEN2SRLite_RGBN"
PINNED_REVISION = "b44156729e7b1b73764c474d5dcbaab0423841a8"
BASE_URL = f"https://huggingface.co/tacofoundation/sen2sr/resolve/{PINNED_REVISION}/SEN2SRLite/NonReference_RGBN_x4"
MODEL_URL = f"{BASE_URL}/mlm.json"


def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def verify_manifest(target_dir: Path) -> bool:
    if not MANIFEST_FILE.exists():
        print(f"ERROR: Manifest not found at {MANIFEST_FILE}", file=sys.stderr)
        return False
    with open(MANIFEST_FILE, "r") as f:
        manifest = json.load(f)
    files = manifest.get("files", {})
    if not files:
        print("ERROR: Manifest contains no file declarations.", file=sys.stderr)
        return False
    for filename, meta in files.items():
        fp = target_dir / filename
        if not fp.exists():
            print(f"Missing artifact file: {filename}", file=sys.stderr)
            return False
        if fp.stat().st_size != meta["size"]:
            print(f"Size mismatch on {filename}: expected {meta['size']}, got {fp.stat().st_size}", file=sys.stderr)
            return False
        h = compute_sha256(fp)
        if h != meta["sha256"]:
            print(f"SHA-256 mismatch on {filename}: expected {meta['sha256']}, got {h}", file=sys.stderr)
            return False
    print("All model artifact files verified against manifest SHA-256 hashes successfully.")
    return True


def download_and_verify(target_dir: Path = MODEL_DIR) -> bool:
    target_dir.mkdir(parents=True, exist_ok=True)
    if not verify_manifest(target_dir):
        print(f"Downloading pinned MLSTAC bundle ({PINNED_REVISION}) from {MODEL_URL} to {target_dir}...")
        try:
            # 1. Download mlm.json directly
            mlm_path = target_dir / "mlm.json"
            urllib.request.urlretrieve(MODEL_URL, mlm_path)

            # 2. Download all assets using mlstac
            mlstac.download(file=str(mlm_path), output_dir=target_dir)

            # Ensure mlm.json is the exact remote file
            urllib.request.urlretrieve(MODEL_URL, mlm_path)
            print("Download complete. Verifying SHA-256 integrity...")
        except Exception as e:
            print(f"ERROR: Download failed: {e}", file=sys.stderr)
            return False

    return verify_manifest(target_dir)


if __name__ == "__main__":
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else MODEL_DIR
    success = download_and_verify(dest)
    if not success:
        print("FATAL: Model verification failed. Failing build.", file=sys.stderr)
        sys.exit(1)
    print("SUCCESS: Model is verified and ready.")
    sys.exit(0)
