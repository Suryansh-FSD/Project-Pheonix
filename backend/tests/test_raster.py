from pathlib import Path
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin, Affine
from PIL import Image
import torch

from app.core.schemas import ErrorCode
from app.model.adapter import SuperResolutionModel, ModelInferenceError
from app.processing.raster import (
    validate_input,
    normalize_reflectance,
    write_super_resolved_geotiff,
    generate_rgb_preview,
    RasterValidationError,
    BAND_DESCRIPTIONS,
)


def _write_input_raster(
    path: Path,
    *,
    data: np.ndarray | None = None,
    width: int = 128,
    height: int = 128,
    count: int = 4,
    crs: str | None = "EPSG:32630",
    transform: Affine | None = None,
    descriptions: tuple[str, ...] | None = ("B04", "B03", "B02", "B08"),
    nodata: float | None = 0.0,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    if transform is None:
        transform = from_origin(350_000.0, 4_300_000.0, 10.0, 10.0)
    if data is None:
        data = np.full((count, height, width), 5_000.0, dtype=np.float32)

    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=height,
        width=width,
        count=count,
        dtype="float32",
        crs=crs,
        transform=transform,
        nodata=nodata,
    ) as dataset:
        dataset.write(data)
        if descriptions is not None:
            dataset.descriptions = descriptions
    return path


def test_validate_input_accepts_valid_128x128_raster(tmp_path: Path) -> None:
    input_path = tmp_path / "valid.tif"
    _write_input_raster(input_path)
    result = validate_input(input_path)

    assert result.data.shape == (4, 128, 128)
    assert result.crs == "EPSG:32630"
    assert result.data.dtype == np.float32


def test_validate_input_rejects_non_128x128(tmp_path: Path) -> None:
    input_path = tmp_path / "wrong_dim.tif"
    _write_input_raster(input_path, width=64, height=64)

    with pytest.raises(RasterValidationError) as exc_info:
        validate_input(input_path)
    assert exc_info.value.code == ErrorCode.INVALID_DIMENSIONS


def test_validate_input_rejects_missing_crs(tmp_path: Path) -> None:
    input_path = tmp_path / "no_crs.tif"
    _write_input_raster(input_path, crs=None)

    with pytest.raises(RasterValidationError) as exc_info:
        validate_input(input_path)
    assert exc_info.value.code == ErrorCode.INVALID_CRS


def test_normalize_reflectance_clips_and_scales() -> None:
    raw = np.array([[[ -10.0, 5000.0, 10000.0, 15000.0, np.nan, np.inf ]]], dtype=np.float32)
    norm = normalize_reflectance(raw)

    assert norm.dtype == np.float32
    assert norm.shape == raw.shape
    assert np.all(norm >= 0.0) and np.all(norm <= 1.0)
    assert norm[0, 0, 0] == 0.0
    assert norm[0, 0, 1] == 0.5
    assert norm[0, 0, 2] == 1.0
    assert norm[0, 0, 3] == 1.0  # clipped
    assert norm[0, 0, 4] == 0.0  # nan cleaned
    assert norm[0, 0, 5] == 0.0  # inf cleaned


def test_write_super_resolved_geotiff_preserves_bounds_and_scales_transform(tmp_path: Path) -> None:
    input_path = tmp_path / "input.tif"
    _write_input_raster(input_path)
    val = validate_input(input_path)

    sr_array = np.full((4, 512, 512), 0.5, dtype=np.float32)
    output_path = tmp_path / "output_2_5m.tif"

    write_super_resolved_geotiff(output_path, sr_array, val.source_profile)

    assert output_path.exists()
    with rasterio.open(output_path) as src:
        assert src.shape == (512, 512)
        assert src.count == 4
        assert src.crs == rasterio.crs.CRS.from_string("EPSG:32630")
        assert src.descriptions == BAND_DESCRIPTIONS
        # Affine scale check
        assert src.transform.a == pytest.approx(2.5)
        assert src.transform.e == pytest.approx(-2.5)
        # Bounds check
        assert tuple(src.bounds) == pytest.approx(val.bounds)


def test_generate_rgb_preview(tmp_path: Path) -> None:
    data = np.random.uniform(0, 10000, size=(4, 128, 128)).astype(np.float32)
    preview_png = tmp_path / "preview.png"

    generate_rgb_preview(data, preview_png)
    assert preview_png.exists()

    with Image.open(preview_png) as img:
        assert img.size == (128, 128)
        assert img.mode == "RGB"
