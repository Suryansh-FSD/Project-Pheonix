import io
import time
import numpy as np
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _create_geotiff_bytes(width: int = 128, height: int = 128, count: int = 4, crs: str = "EPSG:32630") -> bytes:
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


def test_samples_endpoint_empty_in_upload_only_mvp():
    response = client.get("/api/samples")
    assert response.status_code == 200
    samples = response.json()
    assert isinstance(samples, list)
    # Unverified samples are excluded
    assert len(samples) == 0


def test_cached_mode_returns_cache_not_available():
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "cached", "sample_id": "sen2sr_reference_01", "band_order": "B04,B03,B02,B08"}
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "CACHE_NOT_AVAILABLE"


def test_live_upload_and_forced_failure_followed_by_success():
    # 1. Reject non-128x128 upload
    tif_64 = _create_geotiff_bytes(64, 64, 4)
    res_fail = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("small.tif", tif_64, "image/tiff")}
    )
    assert res_fail.status_code == 400
    assert res_fail.json()["detail"]["code"] == "INVALID_DIMENSIONS"

    # 2. Valid live 128x128 upload succeeds immediately after
    tif_128 = _create_geotiff_bytes(128, 128, 4)
    res_ok = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("valid.tif", tif_128, "image/tiff")}
    )
    assert res_ok.status_code == 201
    job_id = res_ok.json()["job_id"]

    for _ in range(20):
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert job["status"] == "completed"
    assert job["metadata"]["output_shape"] == [4, 512, 512]
    assert job["metadata"]["output_pixel_size_m"] == 2.5
    assert job["processing_duration_s"] > 0.0

    # Test asset downloads
    lr_res = client.get(f"/api/jobs/{job_id}/previews/lr_rgb.png")
    assert lr_res.status_code == 200
    sr_res = client.get(f"/api/jobs/{job_id}/previews/sr_rgb.png")
    assert lr_res.status_code == 200
    tif_res = client.get(f"/api/download/{job_id}/geotiff")
    assert tif_res.status_code == 200
