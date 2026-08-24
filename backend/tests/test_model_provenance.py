import re
import sys
from pathlib import Path
import json
from fastapi.testclient import TestClient
from app.main import app
from app.model.provenance import load_model_provenance

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.download_weights import PINNED_REVISION

MANIFEST_PATH = REPO_ROOT / "models" / "manifest.json"


def test_manifest_revision_is_valid_40_hex():
    assert MANIFEST_PATH.exists(), "models/manifest.json must exist"
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    rev = manifest.get("artifact_revision")
    assert rev is not None, "artifact_revision must be present in manifest"
    assert re.match(r"^[0-9a-f]{40}$", rev), f"Revision must be exactly 40 lowercase hex characters, got: {rev} (len={len(rev)})"


def test_downloader_and_manifest_revisions_match():
    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)
    assert manifest["artifact_revision"] == PINNED_REVISION, "Downloader PINNED_REVISION and manifest revision must match exactly"


def test_health_uses_manifest_revision():
    client = TestClient(app)
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    prov = data.get("model_provenance", {})

    with open(MANIFEST_PATH, "r") as f:
        manifest = json.load(f)

    assert prov.get("artifact_revision") == manifest["artifact_revision"]
    assert prov.get("model_name") == "SEN2SRLite"
    assert prov.get("model_variant") == "NonReference_RGBN_x4"
