import io
import time
import uuid
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient

from app.main import app
from app.model.provenance import load_model_provenance
from app.jobs.manager import job_manager

client = TestClient(app)


def _create_geotiff_bytes(
    width: int = 128,
    height: int = 128,
    count: int = 4,
    crs: str = "EPSG:32630",
    descriptions=("B04", "B03", "B02", "B08"),
    res_x: float = 10.0,
    res_y: float = 10.0,
    fill_val: float = 5000.0,
) -> bytes:
    buf = io.BytesIO()
    transform = from_origin(350000.0, 4300000.0, res_x, res_y)
    data = np.full((count, height, width), fill_val, dtype=np.float32)
    with rasterio.open(
        buf,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=count,
        dtype="float32",
        crs=crs,
        transform=transform,
    ) as dst:
        dst.write(data)
        if descriptions:
            dst.descriptions = descriptions
    buf.seek(0)
    return buf.getvalue()


def test_health_provenance_and_model_metadata():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["backend_ready"] is True
    prov = data["model_provenance"]
    assert prov["model_name"] == "SEN2SRLite"
    assert prov["model_variant"] == "NonReference_RGBN_x4"
    assert len(prov["artifact_revision"]) == 40
    assert prov["artifact_revision"] == "b44156729e7b1b73764c474d5dcbaab0423841a8"


def test_reject_wrong_band_count():
    tif_3band = _create_geotiff_bytes(128, 128, count=3, descriptions=("B04", "B03", "B02"))
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("3band.tif", tif_3band, "image/tiff")},
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_BANDS"


def test_reject_wrong_band_order_descriptions():
    tif_wrong_order = _create_geotiff_bytes(
        128, 128, count=4, descriptions=("B02", "B03", "B04", "B08")
    )
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("wrong_order.tif", tif_wrong_order, "image/tiff")},
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_BANDS"


def test_reject_unprojected_crs():
    tif_wgs84 = _create_geotiff_bytes(128, 128, count=4, crs="EPSG:4326")
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("wgs84.tif", tif_wgs84, "image/tiff")},
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_RESOLUTION"


def test_reject_wrong_resolution():
    tif_20m = _create_geotiff_bytes(128, 128, count=4, res_x=20.0, res_y=20.0)
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("20m.tif", tif_20m, "image/tiff")},
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "INVALID_RESOLUTION"


def test_reject_invalid_job_ids_and_nonexistent_previews_downloads():
    # Non-UUID job ID
    res_bad_id = client.get("/api/jobs/not-a-valid-uuid")
    assert res_bad_id.status_code == 404

    # Nonexistent UUID job ID
    random_uuid = str(uuid.uuid4())
    res_not_found = client.get(f"/api/jobs/{random_uuid}")
    assert res_not_found.status_code == 404

    # Preview for nonexistent job
    res_prev = client.get(f"/api/jobs/{random_uuid}/previews/sr_rgb.png")
    assert res_prev.status_code == 404

    # Invalid preview filename
    res_invalid_prev = client.get(f"/api/jobs/{random_uuid}/previews/secret.txt")
    assert res_invalid_prev.status_code == 404

    # Download for nonexistent job
    res_dl = client.get(f"/api/download/{random_uuid}/geotiff")
    assert res_dl.status_code == 404


def test_concurrent_submissions_serialize_cleanly():
    tif_128 = _create_geotiff_bytes(128, 128, count=4)
    
    # Submit job 1
    res1 = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("job1.tif", tif_128, "image/tiff")},
    )
    assert res1.status_code == 201
    jid1 = res1.json()["job_id"]

    # Submit job 2
    res2 = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("job2.tif", tif_128, "image/tiff")},
    )
    assert res2.status_code == 201
    jid2 = res2.json()["job_id"]

    # Poll both until finished
    for _ in range(30):
        j1 = client.get(f"/api/jobs/{jid1}").json()
        j2 = client.get(f"/api/jobs/{jid2}").json()
        if j1["status"] in ["completed", "failed"] and j2["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert j1["status"] == "completed"
    assert j2["status"] == "completed"
