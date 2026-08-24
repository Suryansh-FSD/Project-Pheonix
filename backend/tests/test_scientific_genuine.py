from pathlib import Path
import numpy as np
import pytest
import rasterio
from skimage.metrics import peak_signal_noise_ratio as compute_psnr
from skimage.metrics import structural_similarity as compute_ssim
import torch

from app.model.adapter import SuperResolutionModel, DEFAULT_MODEL_DIR
from app.processing.raster import (
    validate_input,
    process_live_geotiff,
    write_super_resolved_geotiff,
)

DATA_DEMO_DIR = Path(__file__).resolve().parents[2] / "data" / "demo"


def test_genuine_sample_execution_and_metrics(tmp_path: Path):
    sample_tif = DATA_DEMO_DIR / "sen2sr_reference_01.tif"
    hr_ref_tif = DATA_DEMO_DIR / "sen2sr_reference_01_hr_ref.tif"

    assert sample_tif.exists(), f"Reference sample must exist at {sample_tif}"
    assert hr_ref_tif.exists(), f"Reference HR reference must exist at {hr_ref_tif}"

    # 1. Validate real Sentinel-2 GeoTIFF
    val_res = validate_input(sample_tif)
    assert val_res.data.shape == (4, 128, 128)
    assert val_res.crs == "EPSG:32630"
    assert val_res.data.min() >= 0.0 and val_res.data.max() <= 10000.0

    # 2. Load model with manifest verification
    adapter = SuperResolutionModel()
    loaded = adapter.load_model(DEFAULT_MODEL_DIR)
    assert loaded is True
    assert adapter.is_ready() is True

    # 3. Process genuine GeoTIFF
    out_tif = tmp_path / "enhanced_2_5m.tif"
    lr_prev = tmp_path / "lr.png"
    sr_prev = tmp_path / "sr.png"

    res = process_live_geotiff(sample_tif, out_tif, lr_prev, sr_prev, adapter)
    assert res["output_shape"] == (4, 512, 512)
    assert res["output_pixel_size_m"] == 2.5
    assert out_tif.exists()
    assert lr_prev.exists()
    assert sr_prev.exists()

    # 4. Open and verify output GeoTIFF
    with rasterio.open(out_tif) as out_src:
        assert out_src.shape == (512, 512)
        assert out_src.count == 4
        assert out_src.crs == rasterio.crs.CRS.from_string("EPSG:32630")
        sr_data = out_src.read()
        assert np.isfinite(sr_data).all()

    # 5. Check real metrics against ground truth
    with rasterio.open(hr_ref_tif) as hr_src:
        hr_data = hr_src.read()

    psnr = compute_psnr(hr_data / 10000.0, sr_data / 10000.0, data_range=1.0)
    ssim = compute_ssim(hr_data / 10000.0, sr_data / 10000.0, channel_axis=0, data_range=1.0)

    assert psnr > 25.0, f"Expected reasonable PSNR on genuine data, got {psnr:.2f}"
    assert ssim > 0.70, f"Expected reasonable SSIM on genuine data, got {ssim:.4f}"
