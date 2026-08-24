import io
import time
import uuid
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient

from app.main import app
from app.processing.raster import calculate_ndvi, generate_false_color_preview, generate_ndvi_preview, generate_change_preview

client = TestClient(app)


def _create_geotiff_bytes(
    width: int = 128,
    height: int = 128,
    count: int = 4,
    crs: str = "EPSG:32630",
    descriptions=("B04", "B03", "B02", "B08"),
    res_x: float = 10.0,
    res_y: float = 10.0,
    origin_x: float = 350000.0,
    origin_y: float = 4300000.0,
    b04_val: float = 2000.0,
    b08_val: float = 6000.0,
) -> bytes:
    buf = io.BytesIO()
    transform = from_origin(origin_x, origin_y, res_x, res_y)
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


def test_ndvi_validity_zero_denominator_and_masking():
    # 1. Normal valid calculation: (6000 - 2000) / (6000 + 2000) = 0.5
    arr = np.zeros((4, 10, 10), dtype=np.float32)
    arr[0] = 2000.0
    arr[3] = 6000.0
    ndvi, valid_mask = calculate_ndvi(arr)
    assert np.all(valid_mask)
    assert np.allclose(ndvi, 0.5, atol=1e-3)

    # 2. Zero denominator: B08 + B04 == 0 -> must be invalid (NaN, valid_mask=False)
    arr_zero = np.zeros((4, 10, 10), dtype=np.float32)
    ndvi_zero, valid_zero = calculate_ndvi(arr_zero)
    assert not np.any(valid_zero)
    assert np.all(np.isnan(ndvi_zero))

    # 3. NaN & Inf handling
    arr_nan = np.zeros((4, 10, 10), dtype=np.float32)
    arr_nan[0, 0, 0] = np.nan
    arr_nan[3, 0, 0] = 5000.0
    arr_nan[0, 0, 1] = 2000.0
    arr_nan[3, 0, 1] = np.inf
    ndvi_nan, valid_nan = calculate_ndvi(arr_nan)
    assert not valid_nan[0, 0]
    assert not valid_nan[0, 1]
    assert np.isnan(ndvi_nan[0, 0])
    assert np.isnan(ndvi_nan[0, 1])

    # 4. Raster mask exclusion
    mask = np.ones((10, 10), dtype=bool)
    mask[0, 0] = False
    _, valid_masked = calculate_ndvi(arr, mask=mask)
    assert not valid_masked[0, 0]
    assert valid_masked[1, 1]


def test_change_detection_alignment_and_valid_pair_math():
    # 1. Successful change detection between A and B
    tif_a = _create_geotiff_bytes(128, 128, b04_val=2000.0, b08_val=4000.0)
    res_a = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("obs_a.tif", tif_a, "image/tiff")},
    )
    job_a = res_a.json()["job_id"]

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

    cd_res = client.post(
        "/api/change-detection",
        json={"before_job_id": job_a, "after_job_id": job_b, "threshold": 0.15},
    )
    assert cd_res.status_code == 200
    cd_data = cd_res.json()
    assert cd_data["valid_pixel_count"] == 512 * 512
    assert cd_data["changed_pixel_count"] > 0
    assert cd_data["vegetation_gain_percentage"] > 0.0

    # 2. Strict Preview Filename Regex & Traversal Rejection
    valid_preview_url = cd_data["change_preview_url"]
    assert client.get(valid_preview_url).status_code == 200

    # Malformed filename rejection
    assert client.get(f"/api/jobs/{job_a}/previews/change_invalid.png").status_code == 404
    assert client.get(f"/api/jobs/{job_a}/previews/change_123.png").status_code == 404

    # Traversal rejection
    assert client.get(f"/api/jobs/{job_a}/previews/../../../../etc/passwd").status_code == 404

    # 3. Misaligned Transform Rejection
    tif_mis_trans = _create_geotiff_bytes(128, 128, origin_x=400000.0) # Shifted origin
    res_mis = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("obs_mis.tif", tif_mis_trans, "image/tiff")},
    )
    job_mis = res_mis.json()["job_id"]

    for _ in range(30):
        jm = client.get(f"/api/jobs/{job_mis}").json()
        if jm["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    cd_mis = client.post(
        "/api/change-detection",
        json={"before_job_id": job_a, "after_job_id": job_mis, "threshold": 0.15},
    )
    assert cd_mis.status_code == 400
    assert cd_mis.json()["detail"]["code"] == "INPUTS_NOT_ALIGNED"
