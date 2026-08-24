from pathlib import Path
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
import torch

from app.model.adapter import SuperResolutionModel, DEFAULT_MODEL_DIR
from app.processing.raster import (
    validate_input,
    process_live_geotiff,
)

MODELS_DIR = Path("/Users/suryanshdixit/Desktop/VyomSight/models/SEN2SRLite_RGBN")


def _write_synthetic_geotiff(path: Path, offset: float = 0.0) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    transform = from_origin(350_000.0, 4_300_000.0, 10.0, 10.0)
    data = np.zeros((4, 128, 128), dtype=np.float32)
    for b in range(4):
        data[b] = (np.arange(128*128).reshape(128, 128) / (128*128) * 8000.0) + offset + (b * 100.0)

    with rasterio.open(
        path,
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
    return path


def test_real_model_e2e_pipeline_and_pixel_perturbation(tmp_path: Path):
    assert MODELS_DIR.exists(), f"Model directory {MODELS_DIR} must exist"

    adapter = SuperResolutionModel()
    loaded = adapter.load_model(MODELS_DIR)
    assert loaded is True
    assert adapter.is_ready() is True

    # 1. First input GeoTIFF
    input_tif1 = tmp_path / "input1.tif"
    _write_synthetic_geotiff(input_tif1, offset=0.0)

    out_tif1 = tmp_path / "out1.tif"
    lr_prev1 = tmp_path / "lr_prev1.png"
    sr_prev1 = tmp_path / "sr_prev1.png"

    res1 = process_live_geotiff(input_tif1, out_tif1, lr_prev1, sr_prev1, adapter)
    assert res1["output_shape"] == (4, 512, 512)
    assert res1["output_pixel_size_m"] == 2.5
    assert out_tif1.exists()
    assert lr_prev1.exists()
    assert sr_prev1.exists()

    with rasterio.open(out_tif1) as src1:
        data1 = src1.read()
        assert data1.shape == (4, 512, 512)
        assert np.isfinite(data1).all()

    # 2. Perturbed input GeoTIFF
    input_tif2 = tmp_path / "input2.tif"
    _write_synthetic_geotiff(input_tif2, offset=1500.0)

    out_tif2 = tmp_path / "out2.tif"
    lr_prev2 = tmp_path / "lr_prev2.png"
    sr_prev2 = tmp_path / "sr_prev2.png"

    res2 = process_live_geotiff(input_tif2, out_tif2, lr_prev2, sr_prev2, adapter)
    with rasterio.open(out_tif2) as src2:
        data2 = src2.read()

    # Pixel perturbation test: changing input pixels MUST change output pixels
    assert not np.allclose(data1, data2), "Perturbed input GeoTIFF must produce different super-resolved pixel values"
