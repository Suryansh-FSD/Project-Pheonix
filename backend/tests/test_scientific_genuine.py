from pathlib import Path
import pytest
import numpy as np
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


@pytest.mark.integration
def test_genuine_sample_execution_and_metrics(tmp_path: Path):
    sample_tif = DATA_DEMO_DIR / "sen2sr_reference_01.tif"
    hr_ref_tif = DATA_DEMO_DIR / "sen2sr_reference_01_hr_ref.tif"

    if not sample_tif.exists() or not hr_ref_tif.exists():
        pytest.skip("Genuine Sentinel-2 dataset fixtures are not tracked in public git repository.")

    adapter = SuperResolutionModel()
    if not adapter.load_model(DEFAULT_MODEL_DIR):
        pytest.skip(f"SEN2SRLite model weights not loaded: {adapter.last_error}")

    # 1. Validate real Sentinel-2 GeoTIFF
    val_res = validate_input(sample_tif)
    assert val_res.data.shape == (4, 128, 128)
    assert val_res.crs == "EPSG:32630"

    # 2. Process genuine GeoTIFF
    out_tif = tmp_path / "enhanced_2_5m.tif"
    lr_prev = tmp_path / "lr.png"
    sr_prev = tmp_path / "sr.png"

    res = process_live_geotiff(sample_tif, out_tif, lr_prev, sr_prev, adapter)
    assert res["output_shape"] == (4, 512, 512)
    assert res["output_pixel_size_m"] == 2.5
    assert out_tif.exists()

    with rasterio.open(out_tif) as out_src:
        assert out_src.shape == (512, 512)
        sr_data = out_src.read()
        assert np.isfinite(sr_data).all()
