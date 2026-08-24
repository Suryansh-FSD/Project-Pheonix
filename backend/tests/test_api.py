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


def test_samples_endpoint():
    response = client.get("/api/samples")
    assert response.status_code == 200
    samples = response.json()
    assert isinstance(samples, list)
    assert len(samples) >= 2
    ids = [s["sample_id"] for s in samples]
    assert "spain_crops_01" in ids
    assert "spain_urban_01" in ids


def test_cached_mode_sample_specific_differences_and_assets():
    # 1. Run Spain Crops in Cached mode
    res_crops = client.post(
        "/api/enhance",
        data={"execution_mode": "cached", "sample_id": "spain_crops_01", "band_order": "B04,B03,B02,B08"}
    )
    assert res_crops.status_code == 201
    crops_jid = res_crops.json()["job_id"]
    crops_job = client.get(f"/api/jobs/{crops_jid}").json()

    assert crops_job["status"] == "cached"
    assert crops_job["cached"] is True
    assert crops_job["reference_available"] is True
    assert crops_job["metrics"]["psnr"]["value"] is not None
    assert crops_job["metrics"]["ssim"]["value"] is not None

    # Check cached assets exist and open
    lr_res = client.get(f"/api/jobs/{crops_jid}/previews/lr_rgb.png")
    assert lr_res.status_code == 200
    tif_res = client.get(f"/api/download/{crops_jid}/geotiff")
    assert tif_res.status_code == 200

    # 2. Run Spain Urban in Cached mode
    res_urban = client.post(
        "/api/enhance",
        data={"execution_mode": "cached", "sample_id": "spain_urban_01", "band_order": "B04,B03,B02,B08"}
    )
    assert res_urban.status_code == 201
    urban_jid = res_urban.json()["job_id"]
    urban_job = client.get(f"/api/jobs/{urban_jid}").json()

    # 3. Assert sample-specific bounds and checksums are DIFFERENT
    assert crops_job["metadata"]["bounds"] != urban_job["metadata"]["bounds"], "Bounds must differ between crops and urban"
    assert crops_job["cache_metadata"]["source_sample_checksum"] != urban_job["cache_metadata"]["source_sample_checksum"]


def test_cached_mode_rejects_arbitrary_upload():
    response = client.post(
        "/api/enhance",
        data={"execution_mode": "cached", "sample_id": "spain_crops_01"},
        files={"file": ("upload.tif", b"some_bytes", "image/tiff")}
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVALID_REQUEST"


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
