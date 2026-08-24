import io
import time
import uuid
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient

from app.main import app
from app.processing.raster import calculate_ndvi, generate_false_color_preview, generate_ndvi_preview

client = TestClient(app)


def _create_geotiff_bytes(
    width: int = 128,
    height: int = 128,
    count: int = 4,
    crs: str = "EPSG:32630",
    descriptions=("B04", "B03", "B02", "B08"),
    res_x: float = 10.0,
    res_y: float = 10.0,
    b04_val: float = 2000.0,
    b08_val: float = 6000.0,
) -> bytes:
    buf = io.BytesIO()
    transform = from_origin(350000.0, 4300000.0, res_x, res_y)
    data = np.full((count, height, width), 3000.0, dtype=np.float32)
    data[0] = b04_val  # Red (B04)
    data[1] = 2500.0   # Green (B03)
    data[2] = 2000.0   # Blue (B02)
    data[3] = b08_val  # NIR (B08)
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


def test_ndvi_formula_and_zero_denominator():
    # B04 = 2000, B08 = 6000 -> (6000 - 2000) / (6000 + 2000) = 4000 / 8000 = 0.5
    arr = np.zeros((4, 10, 10), dtype=np.float32)
    arr[0] = 2000.0
    arr[3] = 6000.0
    ndvi = calculate_ndvi(arr)
    assert np.allclose(ndvi, 0.5, atol=1e-3)

    # Zero reflectance -> denominator zero protected
    arr_zero = np.zeros((4, 10, 10), dtype=np.float32)
    ndvi_zero = calculate_ndvi(arr_zero)
    assert np.all(np.isfinite(ndvi_zero))
    assert np.all(ndvi_zero >= -1.0) and np.all(ndvi_zero <= 1.0)


def test_live_job_generates_all_previews_and_vegetation_analysis():
    tif_128 = _create_geotiff_bytes(128, 128, b04_val=1500.0, b08_val=7500.0)
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("veg_test.tif", tif_128, "image/tiff")},
    )
    assert res.status_code == 201
    job_id = res.json()["job_id"]

    for _ in range(25):
        j = client.get(f"/api/jobs/{job_id}").json()
        if j["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert j["status"] == "completed"
    assert j["previews"]["lr_ndvi_url"] is not None
    assert j["previews"]["sr_ndvi_url"] is not None
    assert j["previews"]["lr_fc_url"] is not None
    assert j["previews"]["sr_fc_url"] is not None

    # Test preview endpoints
    assert client.get(f"/api/jobs/{job_id}/previews/lr_ndvi.png").status_code == 200
    assert client.get(f"/api/jobs/{job_id}/previews/sr_ndvi.png").status_code == 200
    assert client.get(f"/api/jobs/{job_id}/previews/lr_fc.png").status_code == 200
    assert client.get(f"/api/jobs/{job_id}/previews/sr_fc.png").status_code == 200

    # Test Vegetation Analysis Endpoint
    veg_res = client.get(f"/api/jobs/{job_id}/analysis/vegetation")
    assert veg_res.status_code == 200
    veg_data = veg_res.json()
    assert veg_data["job_id"] == job_id
    assert veg_data["valid_pixel_count"] == 512 * 512
    assert veg_data["mean_ndvi"] > 0.0
    assert veg_data["vegetation_fraction"] >= 0.0


def test_change_detection_aligned_and_misaligned():
    # Create Job A (Before: lower NIR)
    tif_a = _create_geotiff_bytes(128, 128, b04_val=2000.0, b08_val=4000.0)
    res_a = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("obs_a.tif", tif_a, "image/tiff")},
    )
    job_a = res_a.json()["job_id"]

    # Create Job B (After: higher NIR -> vegetation gain)
    tif_b = _create_geotiff_bytes(128, 128, b04_val=1000.0, b08_val=8000.0)
    res_b = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("obs_b.tif", tif_b, "image/tiff")},
    )
    job_b = res_b.json()["job_id"]

    for _ in range(30):
        ja = client.get(f"/api/jobs/{job_a}").json()
        jb = client.get(f"/api/jobs/{job_b}").json()
        if ja["status"] in ["completed", "failed"] and jb["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert ja["status"] == "completed"
    assert jb["status"] == "completed"

    # Compute Change Detection between A and B
    cd_res = client.post(
        "/api/change-detection",
        json={"before_job_id": job_a, "after_job_id": job_b, "threshold": 0.15},
    )
    assert cd_res.status_code == 200
    cd_data = cd_res.json()
    assert cd_data["before_job_id"] == job_a
    assert cd_data["after_job_id"] == job_b
    assert cd_data["changed_pixel_count"] > 0
    assert cd_data["vegetation_gain_percentage"] > 0.0
    assert cd_data["change_preview_url"].startswith(f"/api/jobs/{job_a}/previews/change_")

    # Verify change preview PNG serves 200
    preview_res = client.get(cd_data["change_preview_url"])
    assert preview_res.status_code == 200

    # Reject identical before and after job
    same_res = client.post(
        "/api/change-detection",
        json={"before_job_id": job_a, "after_job_id": job_a, "threshold": 0.15},
    )
    assert same_res.status_code == 400
