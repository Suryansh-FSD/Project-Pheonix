import io
import time
import numpy as np
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient
from app.main import app
from app.model.adapter import model_adapter

client = TestClient(app)


def _create_geotiff_bytes(width: int, height: int, count: int = 4, crs: str = "EPSG:32630") -> bytes:
    buf = io.BytesIO()
    transform = from_origin(350000.0, 4300000.0, 10.0, 10.0)
    data = np.full((count, height, width), 5000.0, dtype=np.float32)
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
        dst.descriptions = ("B04", "B03", "B02", "B08")
    buf.seek(0)
    return buf.getvalue()


def test_samples_endpoint():
    response = client.get("/api/samples")
    assert response.status_code == 200
    samples = response.json()
    assert isinstance(samples, list)
    assert len(samples) >= 2
    ids = [s["sample_id"] for s in samples]
    assert "spain_crops_01" in ids
    assert "spain_urban_01" in ids


def test_enhance_cached_success():
    response = client.post(
        "/api/enhance",
        data={
            "execution_mode": "cached",
            "sample_id": "spain_crops_01",
            "band_order": "B04,B03,B02,B08"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "cached"
    assert data["cached"] is True
    assert data["sample_id"] == "spain_crops_01"

    # Poll status
    job_id = data["job_id"]
    job_res = client.get(f"/api/jobs/{job_id}")
    assert job_res.status_code == 200
    job_data = job_res.json()
    assert job_data["status"] == "cached"
    assert job_data["cached"] is True
    assert job_data["device_used"] == "cached_disk"


def test_enhance_cached_rejects_arbitrary_upload():
    response = client.post(
        "/api/enhance",
        data={
            "execution_mode": "cached",
            "sample_id": "spain_crops_01",
        },
        files={"file": ("test.tif", b"dummy_geotiff_bytes", "image/tiff")}
    )
    assert response.status_code == 400
    err = response.json()["detail"]
    assert err["code"] == "INVALID_REQUEST"


def test_enhance_rejects_conflicting_file_and_sample():
    tif_128 = _create_geotiff_bytes(128, 128, 4)
    response = client.post(
        "/api/enhance",
        data={
            "execution_mode": "live",
            "sample_id": "spain_crops_01",
        },
        files={"file": ("test.tif", tif_128, "image/tiff")}
    )
    assert response.status_code == 400
    err = response.json()["detail"]
    assert err["code"] == "INVALID_REQUEST"


def test_enhance_live_rejects_wrong_dimensions():
    tif_64 = _create_geotiff_bytes(64, 64, 4)
    response = client.post(
        "/api/enhance",
        data={
            "execution_mode": "live",
            "band_order": "B04,B03,B02,B08"
        },
        files={"file": ("wrong_dim.tif", tif_64, "image/tiff")}
    )
    assert response.status_code == 400
    err = response.json()["detail"]
    assert err["code"] == "INVALID_DIMENSIONS"


def test_enhance_live_accepts_valid_128x128_geotiff_and_runs_real_pipeline():
    tif_128 = _create_geotiff_bytes(128, 128, 4)
    response = client.post(
        "/api/enhance",
        data={
            "execution_mode": "live",
            "band_order": "B04,B03,B02,B08"
        },
        files={"file": ("valid.tif", tif_128, "image/tiff")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "queued"
    job_id = data["job_id"]

    # Poll until completed (background task runs immediately in TestClient)
    for _ in range(20):
        res = client.get(f"/api/jobs/{job_id}")
        assert res.status_code == 200
        job_data = res.json()
        if job_data["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert job_data["status"] == "completed"
    assert job_data["metadata"]["output_shape"] == [4, 512, 512]
    assert job_data["metadata"]["output_pixel_size_m"] == 2.5

    # Check downloads
    dl_res = client.get(f"/api/download/{job_id}/geotiff")
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 0
