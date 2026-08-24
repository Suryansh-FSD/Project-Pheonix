"""
Raster validation, preprocessing, GeoTIFF writing, and analytical preview generation.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Tuple, Optional

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
import torch

from app.core.schemas import ErrorCode

INPUT_WIDTH = 128
INPUT_HEIGHT = 128
SCALE_FACTOR = 4
INPUT_PIXEL_SIZE_M = 10.0
OUTPUT_PIXEL_SIZE_M = 2.5
REFLECTANCE_SCALE = 10000.0
BAND_ORDER = ("B04", "B03", "B02", "B08")
BAND_DESCRIPTIONS = ("B04", "B03", "B02", "B08")


class RasterValidationError(Exception):
    def __init__(self, code: ErrorCode, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class RasterValidationResult:
    data: np.ndarray
    crs: str
    transform: Affine
    bounds: Tuple[float, float, float, float]
    source_profile: dict[str, Any]
    dataset_mask: np.ndarray


def validate_input(input_path: Path) -> RasterValidationResult:
    """Validate 4-band 128x128 Sentinel-2 GeoTIFF input."""
    try:
        with rasterio.open(input_path) as dataset:
            _validate_dataset_structure(dataset)
            raw = dataset.read(out_dtype=np.float32)
            _validate_reflectance_range(raw, dataset.nodata)

            data = np.asarray(raw[:4], dtype=np.float32)
            dataset_mask = dataset.dataset_mask() > 0

            if dataset.nodata is not None and np.isfinite(dataset.nodata):
                nodata_mask = (raw[:4] != np.float32(dataset.nodata)).all(axis=0)
                dataset_mask &= nodata_mask

            # Clean raw data for inference while maintaining raw validity mask
            cleaned_data = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)

            valid_mask = _valid_pixel_mask(raw[:4], dataset.nodata) & dataset_mask
            profile = dict(dataset.profile)
            profile["valid_mask"] = valid_mask
            profile["descriptions"] = tuple(dataset.descriptions) if dataset.descriptions else BAND_DESCRIPTIONS
            profile["band_tags"] = [dataset.tags(i) for i in range(1, dataset.count + 1)]
            profile["tags"] = dataset.tags()

            bounds = (
                float(dataset.bounds.left),
                float(dataset.bounds.bottom),
                float(dataset.bounds.right),
                float(dataset.bounds.top),
            )

            return RasterValidationResult(
                data=cleaned_data,
                crs=dataset.crs.to_string(),
                transform=dataset.transform,
                bounds=bounds,
                source_profile=profile,
                dataset_mask=valid_mask,
            )
    except rasterio.errors.RasterioIOError as exc:
        raise RasterValidationError(ErrorCode.INVALID_FILE, f"Could not read GeoTIFF: {exc}") from exc


def normalize_reflectance(array_4band: np.ndarray) -> np.ndarray:
    """Normalize surface reflectance [0, 10000] to model input range [0.0, 1.0]."""
    arr = np.asarray(array_4band, dtype=np.float32)
    cleaned = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
    return np.clip(cleaned / REFLECTANCE_SCALE, 0.0, 1.0)


def write_super_resolved_geotiff(
    output_path: Path,
    output: np.ndarray,
    source_profile: dict[str, Any],
) -> Path:
    """Write 4-band super-resolved GeoTIFF scaled to 2.5m pixel resolution."""
    expected_shape = (4, INPUT_HEIGHT * SCALE_FACTOR, INPUT_WIDTH * SCALE_FACTOR)
    if output.shape != expected_shape:
        raise ValueError(f"Expected output shape {expected_shape}, received {output.shape}")

    transform: Affine = source_profile["transform"]
    crs = source_profile["crs"]
    tags = source_profile.get("tags", {})
    band_tags = source_profile.get("band_tags", [])
    source_valid_mask = source_profile.get("valid_mask")

    profile = {
        k: v
        for k, v in source_profile.items()
        if k not in {"tags", "band_tags", "descriptions", "valid_mask"}
    }
    scaled_transform = transform * Affine.scale(1.0 / SCALE_FACTOR, 1.0 / SCALE_FACTOR)

    profile.update(
        driver="GTiff",
        count=4,
        height=expected_shape[1],
        width=expected_shape[2],
        dtype="float32",
        transform=scaled_transform,
        crs=crs,
    )

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)

    output_data = output.copy()
    output_valid_mask: np.ndarray | None = None
    if source_valid_mask is not None:
        source_valid_mask = np.asarray(source_valid_mask, dtype=bool)
        if source_valid_mask.shape == (INPUT_HEIGHT, INPUT_WIDTH):
            output_valid_mask = np.repeat(
                np.repeat(source_valid_mask, SCALE_FACTOR, axis=0),
                SCALE_FACTOR,
                axis=1,
            )
            nodata = profile.get("nodata")
            if nodata is not None:
                output_data[:, ~output_valid_mask] = nodata

    with rasterio.open(destination, "w", **profile) as dataset:
        dataset.write(output_data)
        dataset.descriptions = BAND_DESCRIPTIONS
        if output_valid_mask is not None:
            dataset.write_mask(output_valid_mask.astype(np.uint8) * 255)
        if tags:
            dataset.update_tags(**tags)
        for band_index, metadata in enumerate(band_tags[:4], start=1):
            if metadata:
                dataset.update_tags(band_index, **metadata)

    return destination


def generate_rgb_preview(array_4band: np.ndarray, output_png: Path, mask: Optional[np.ndarray] = None) -> Path:
    """Generate 8-bit natural-color RGB (B04, B03, B02) PNG preview with alpha transparency for invalid pixels."""
    analytical = np.asarray(array_4band, dtype=np.float32)
    if analytical.ndim != 3 or analytical.shape[0] != 4:
        raise ValueError(f"Expected array of shape (4, H, W), got {analytical.shape}")

    # B04 (Red=0), B03 (Green=1), B02 (Blue=2)
    stretched_bands = [_percentile_stretch(analytical[i], mask) for i in range(3)]
    
    if mask is not None:
        alpha = np.where(mask, 255, 0).astype(np.uint8)
        rgba = np.stack(stretched_bands + [alpha], axis=-1)
        mode = "RGBA"
    else:
        rgba = np.stack(stretched_bands, axis=-1)
        mode = "RGB"

    destination = Path(output_png)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode=mode).save(destination, format="PNG")
    return destination


def generate_false_color_preview(array_4band: np.ndarray, output_png: Path, mask: Optional[np.ndarray] = None) -> Path:
    """Generate False-Color NIR/Red/Green composite (Red=B08, Green=B04, Blue=B03) with alpha transparency."""
    analytical = np.asarray(array_4band, dtype=np.float32)
    if analytical.ndim != 3 or analytical.shape[0] != 4:
        raise ValueError(f"Expected array of shape (4, H, W), got {analytical.shape}")

    # Red=B08 (idx 3), Green=B04 (idx 0), Blue=B03 (idx 1)
    stretched_r = _percentile_stretch(analytical[3], mask)
    stretched_g = _percentile_stretch(analytical[0], mask)
    stretched_b = _percentile_stretch(analytical[1], mask)

    if mask is not None:
        alpha = np.where(mask, 255, 0).astype(np.uint8)
        rgba = np.stack([stretched_r, stretched_g, stretched_b, alpha], axis=-1)
        mode = "RGBA"
    else:
        rgba = np.stack([stretched_r, stretched_g, stretched_b], axis=-1)
        mode = "RGB"

    destination = Path(output_png)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode=mode).save(destination, format="PNG")
    return destination


def calculate_ndvi(array_4band: np.ndarray, mask: Optional[np.ndarray] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate NDVI strictly from raw surface reflectance:
    NDVI = (B08 - B04) / (B08 + B04)
    B04 is index 0 (Red), B08 is index 3 (NIR).
    
    Returns (ndvi_array, valid_mask):
    - Invalid pixels remain NaN in ndvi_array.
    - Valid denominators require abs(B08 + B04) > 1e-6.
    """
    analytical = np.asarray(array_4band, dtype=np.float32)
    b04 = analytical[0]  # Red
    b08 = analytical[3]  # NIR

    denom = b08 + b04
    denom_valid = np.abs(denom) > 1e-6
    finite_valid = np.isfinite(b04) & np.isfinite(b08)

    valid_mask = finite_valid & denom_valid
    if mask is not None:
        valid_mask &= (mask > 0)

    ndvi = np.full_like(b04, np.nan, dtype=np.float32)
    ndvi[valid_mask] = np.clip(
        (b08[valid_mask] - b04[valid_mask]) / denom[valid_mask],
        -1.0,
        1.0,
    )
    return ndvi, valid_mask


def generate_ndvi_preview(
    array_4band: np.ndarray,
    output_png: Path,
    mask: Optional[np.ndarray] = None,
) -> Tuple[Path, dict[str, Any]]:
    """
    Calculate NDVI and generate colorized RdYlGn palette PNG preview with transparent invalid pixels.
    Returns preview path and analytical vegetation metrics.
    """
    ndvi, valid_mask = calculate_ndvi(array_4band, mask)
    valid_count = int(np.count_nonzero(valid_mask))

    h, w = ndvi.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    if valid_count > 0:
        valid_ndvi = ndvi[valid_mask]
        min_v = float(np.min(valid_ndvi))
        max_v = float(np.max(valid_ndvi))
        mean_v = float(np.mean(valid_ndvi))
        veg_fraction = float(np.count_nonzero(valid_ndvi > 0.3) / valid_count)

        # Colorize valid NDVI [-0.2, 0.8] normalized to [0, 1]
        for y in range(h):
            for x in range(w):
                if not valid_mask[y, x]:
                    rgba[y, x] = [0, 0, 0, 0]  # Fully transparent
                    continue

                v = ndvi[y, x]
                norm_val = np.clip((v - (-0.2)) / (0.8 - (-0.2)), 0.0, 1.0)
                if norm_val < 0.3:  # Water / Bare
                    rgba[y, x] = [int(160 * (1 - norm_val)), int(120 * (1 - norm_val)), int(80 + 100 * norm_val), 255]
                elif norm_val < 0.6:  # Sparse / Soil / Grass
                    t = (norm_val - 0.3) / 0.3
                    rgba[y, x] = [int(220 * (1 - 0.5 * t)), int(200 + 40 * t), 50, 255]
                else:  # Dense Vegetation
                    t = (norm_val - 0.6) / 0.4
                    rgba[y, x] = [int(40 * (1 - t)), int(140 + 100 * t), int(40 * (1 - t)), 255]
    else:
        min_v = 0.0
        max_v = 0.0
        mean_v = 0.0
        veg_fraction = 0.0

    destination = Path(output_png)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(destination, format="PNG")

    stats = {
        "valid_pixel_count": valid_count,
        "min_ndvi": round(min_v, 4) if valid_count > 0 else 0.0,
        "max_ndvi": round(max_v, 4) if valid_count > 0 else 0.0,
        "mean_ndvi": round(mean_v, 4) if valid_count > 0 else 0.0,
        "vegetation_fraction": round(veg_fraction, 4) if valid_count > 0 else 0.0,
        "threshold_used": 0.3,
    }
    return destination, stats


def generate_change_preview(
    before_4band: np.ndarray,
    after_4band: np.ndarray,
    threshold: float,
    output_png: Path,
    mask_before: Optional[np.ndarray] = None,
    mask_after: Optional[np.ndarray] = None,
) -> Tuple[Path, dict[str, Any]]:
    """
    Screen spectral change between two aligned 4-band rasters using delta NDVI.
    Strictly uses only valid paired pixels as denominator for statistics.
    """
    ndvi_before, valid_before = calculate_ndvi(before_4band, mask_before)
    ndvi_after, valid_after = calculate_ndvi(after_4band, mask_after)

    valid_pair = valid_before & valid_after
    valid_pair_count = int(np.count_nonzero(valid_pair))

    if valid_pair_count == 0:
        raise RasterValidationError(
            ErrorCode.NO_VALID_PIXELS,
            "No valid paired pixels found for change detection between observations.",
        )

    delta_valid = ndvi_after[valid_pair] - ndvi_before[valid_pair]

    gain_mask = delta_valid >= threshold
    loss_mask = delta_valid <= -threshold
    changed_mask = np.abs(delta_valid) >= threshold

    changed_count = int(np.count_nonzero(changed_mask))
    gain_count = int(np.count_nonzero(gain_mask))
    loss_count = int(np.count_nonzero(loss_mask))

    changed_pct = round((changed_count / valid_pair_count) * 100.0, 2)
    gain_pct = round((gain_count / valid_pair_count) * 100.0, 2)
    loss_pct = round((loss_count / valid_pair_count) * 100.0, 2)
    mean_delta = round(float(np.mean(delta_valid)), 4)

    # Colorize change map
    h, w = valid_pair.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    for y in range(h):
        for x in range(w):
            if not valid_pair[y, x]:
                rgba[y, x] = [0, 0, 0, 0]  # Transparent invalid pixel
                continue

            d = ndvi_after[y, x] - ndvi_before[y, x]
            if d >= threshold:  # Vegetation Gain (Green)
                rgba[y, x] = [34, 197, 94, 235]
            elif d <= -threshold:  # Vegetation Loss (Red)
                rgba[y, x] = [239, 68, 68, 235]
            else:  # Neutral
                rgba[y, x] = [100, 116, 139, 45]

    destination = Path(output_png)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, mode="RGBA").save(destination, format="PNG")

    stats = {
        "valid_pixel_count": valid_pair_count,
        "changed_pixel_count": changed_count,
        "changed_percentage": changed_pct,
        "vegetation_gain_percentage": gain_pct,
        "vegetation_loss_percentage": loss_pct,
        "mean_ndvi_delta": mean_delta,
        "threshold": threshold,
    }
    return destination, stats


def process_live_geotiff(
    input_path: Path,
    output_geotiff_path: Path,
    lr_preview_path: Path,
    sr_preview_path: Path,
    adapter: Any,
    lr_ndvi_path: Path | None = None,
    sr_ndvi_path: Path | None = None,
    lr_fc_path: Path | None = None,
    sr_fc_path: Path | None = None,
) -> dict[str, Any]:
    """
    Execute full end-to-end processing pipeline on a genuine 4-band GeoTIFF,
    generating Natural Color, Vegetation (NDVI), and False Color (NIR/Red/Green) previews.
    """
    # 1. Validate input GeoTIFF
    val_result = validate_input(input_path)

    # 2. Generate LR RGB & False Color & NDVI Previews with mask
    generate_rgb_preview(val_result.data, lr_preview_path, val_result.dataset_mask)
    if lr_fc_path:
        generate_false_color_preview(val_result.data, lr_fc_path, val_result.dataset_mask)
    if lr_ndvi_path:
        generate_ndvi_preview(val_result.data, lr_ndvi_path, val_result.dataset_mask)

    # 3. Normalize reflectance to [0.0, 1.0]
    norm_data = normalize_reflectance(val_result.data)

    # 4. Prepare PyTorch tensor [1, 4, 128, 128]
    in_tensor = torch.from_numpy(norm_data).unsqueeze(0).float()

    # 5. Run genuine model inference [1, 4, 512, 512] in [0.0, 1.0]
    sr_tensor = adapter.enhance(in_tensor)
    sr_norm = sr_tensor.squeeze(0).numpy()

    # 6. Unnormalize to surface reflectance scale [0, 10000]
    sr_reflectance = sr_norm * REFLECTANCE_SCALE

    # 7. Write super-resolved GeoTIFF in [0, 10000] scale
    write_super_resolved_geotiff(output_geotiff_path, sr_reflectance, val_result.source_profile)

    # Calculate 4x upsampled valid mask for SR outputs
    sr_mask = np.repeat(np.repeat(val_result.dataset_mask, SCALE_FACTOR, axis=0), SCALE_FACTOR, axis=1)

    # 8. Generate SR RGB & False Color & NDVI Previews with SR mask
    generate_rgb_preview(sr_reflectance, sr_preview_path, sr_mask)
    if sr_fc_path:
        generate_false_color_preview(sr_reflectance, sr_fc_path, sr_mask)
    if sr_ndvi_path:
        _, ndvi_stats = generate_ndvi_preview(sr_reflectance, sr_ndvi_path, sr_mask)
    else:
        ndvi_stats = {}

    return {
        "crs": val_result.crs,
        "input_shape": (4, INPUT_HEIGHT, INPUT_WIDTH),
        "output_shape": (4, INPUT_HEIGHT * SCALE_FACTOR, INPUT_WIDTH * SCALE_FACTOR),
        "input_pixel_size_m": INPUT_PIXEL_SIZE_M,
        "output_pixel_size_m": OUTPUT_PIXEL_SIZE_M,
        "bounds": val_result.bounds,
        "geotiff_path": str(output_geotiff_path),
        "lr_preview_path": str(lr_preview_path),
        "sr_preview_path": str(sr_preview_path),
        "ndvi_stats": ndvi_stats,
    }


def _validate_dataset_structure(dataset: rasterio.io.DatasetReader) -> None:
    if dataset.count != 4:
        raise RasterValidationError(ErrorCode.INVALID_BANDS, f"Expected 4 bands, received {dataset.count}")
    if (dataset.height, dataset.width) != (INPUT_HEIGHT, INPUT_WIDTH):
        raise RasterValidationError(
            ErrorCode.INVALID_DIMENSIONS,
            f"Expected dimensions 128x128, received {dataset.width}x{dataset.height}",
        )
    if dataset.crs is None:
        raise RasterValidationError(ErrorCode.INVALID_CRS, "Input CRS is required")
    if not _is_valid_transform(dataset.transform):
        raise RasterValidationError(ErrorCode.INVALID_FILE, "A valid geospatial affine transform is required")

    if not dataset.crs.is_projected:
        raise RasterValidationError(
            ErrorCode.INVALID_RESOLUTION,
            "Input CRS must use projected linear units for 10 m validation",
        )

    unit_factor = float(dataset.crs.linear_units_factor[1])
    x_size = float(np.hypot(dataset.transform.a, dataset.transform.d)) * unit_factor
    y_size = float(np.hypot(dataset.transform.b, dataset.transform.e)) * unit_factor
    if not (
        np.isclose(x_size, INPUT_PIXEL_SIZE_M, rtol=0.0, atol=1e-5)
        and np.isclose(y_size, INPUT_PIXEL_SIZE_M, rtol=0.0, atol=1e-5)
    ):
        raise RasterValidationError(
            ErrorCode.INVALID_RESOLUTION,
            f"Expected 10 m pixels, received {x_size:g} by {y_size:g}",
        )

    descriptions = tuple(dataset.descriptions)
    if any(d for d in descriptions):
        if not all(d for d in descriptions):
            raise RasterValidationError(ErrorCode.INVALID_BANDS, "Band descriptions are incomplete")
        described_order = tuple(_band_code(d) for d in descriptions)
        if described_order != BAND_ORDER:
            raise RasterValidationError(ErrorCode.INVALID_BANDS, f"Expected band order {BAND_ORDER}, got {described_order}")
        return

    tagged_order = tuple(
        _band_code(dataset.tags(i).get("band_name")) for i in range(1, dataset.count + 1)
    )
    if tagged_order != BAND_ORDER:
        raise RasterValidationError(
            ErrorCode.INVALID_BANDS,
            "Band order missing or ambiguous; expected B04, B03, B02, B08 in descriptions or band_name tags",
        )


def _validate_reflectance_range(data: np.ndarray, nodata: float | None) -> None:
    valid = np.isfinite(data)
    if nodata is not None and np.isfinite(nodata):
        valid &= data != np.float32(nodata)
    finite_values = data[valid]
    if finite_values.size == 0:
        raise RasterValidationError(ErrorCode.INVALID_FILE, "Raster contains no valid pixels")
    if finite_values.min() < 0.0 or finite_values.max() > REFLECTANCE_SCALE:
        raise RasterValidationError(
            ErrorCode.INVALID_FILE,
            "Reflectance values must be within expected Sentinel-2 0..10000 range",
        )


def _valid_pixel_mask(data: np.ndarray, nodata: float | None) -> np.ndarray:
    valid = np.isfinite(data)
    if nodata is not None and np.isfinite(nodata):
        valid &= data != np.float32(nodata)
    return np.all(valid, axis=0)


def _is_valid_transform(transform: Affine) -> bool:
    coefficients = np.asarray(tuple(transform)[:6], dtype=np.float64)
    return (
        np.isfinite(coefficients).all()
        and transform != Affine.identity()
        and not np.isclose(transform.determinant, 0.0)
    )


def _band_code(desc: str | None) -> str:
    return "" if desc is None else desc.strip().upper().split(maxsplit=1)[0]


def _percentile_stretch(band: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
    values = np.asarray(band, dtype=np.float32)
    finite = np.isfinite(values)
    if mask is not None:
        finite &= (mask > 0)

    stretched = np.zeros(values.shape, dtype=np.uint8)
    if not finite.any():
        return stretched

    low, high = np.percentile(values[finite], (2.0, 98.0))
    if not high > low:
        return stretched

    scaled = np.clip((values[finite] - low) / (high - low), 0.0, 1.0)
    stretched[finite] = np.rint(scaled * 255.0).astype(np.uint8)
    return stretched
