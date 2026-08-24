import io
import time
import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _create_synthetic_128x128_geotiff() -> bytes:
    buf = io.BytesIO()
    transform = from_origin(350000.0, 4300000.0, 10.0, 10.0)
    data = np.zeros((4, 128, 128), dtype=np.float32)
    for b in range(4):
        data[b] = np.arange(128 * 128).reshape(128, 128) / (128 * 128) * 8000.0 + (b * 100.0)

    with rasterio.open(
        buf,
        "w",
        driver="GTiff",
        height=128,
        width=128,
        count=4,
        dtype="float32",
        crs="EPSG:32630",
        transform=transform,
        nodata=0.0,
    ) as dst:
        dst.write(data)
        dst.descriptions = ("B04", "B03", "B02", "B08")
    buf.seek(0)
    return buf.getvalue()


def test_health_remains_responsive_during_inference():
    """Prove /api/health responds immediately while a live inference job runs in background."""
    tif_bytes = _create_synthetic_128x128_geotiff()

    # 1. Start a live job
    res = client.post(
        "/api/enhance",
        data={"execution_mode": "live", "band_order": "B04,B03,B02,B08"},
        files={"file": ("test_responsive.tif", tif_bytes, "image/tiff")},
    )
    assert res.status_code == 201
    job_id = res.json()["job_id"]

    # 2. Probe /api/health concurrently while job is running or finishing
    health_times = []
    for _ in range(5):
        t0 = time.perf_counter()
        h_res = client.get("/api/health")
        latency = time.perf_counter() - t0
        health_times.append(latency)
        assert h_res.status_code == 200
        assert h_res.json()["status"] == "ok"
        time.sleep(0.05)

    max_latency = max(health_times)
    assert max_latency < 0.20, f"Health endpoint latency spiked to {max_latency:.4f}s during inference"

    # 3. Verify job finishes successfully
    for _ in range(30):
        j_res = client.get(f"/api/jobs/{job_id}")
        assert j_res.status_code == 200
        if j_res.json()["status"] in ["completed", "failed"]:
            break
        time.sleep(0.1)

    assert j_res.json()["status"] == "completed"
