"""
GeoSR Geospatial Raster Processing Pipeline
Strict 4-band B04, B03, B02, B08 10m -> 2.5m GeoTIFF validation, transformation, and preview rendering.
Owned by recovery/scientific.
"""

from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Tuple
import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import Affine
import torch

from app.core.schemas import ErrorCode

INPUT_WIDTH = 128
INPUT_HEIGHT = 128
SCALE_FACTOR = 4
INPUT_PIXEL_SIZE_M = 10.0
OUTPUT_PIXEL_SIZE_M = 2.5
BAND_ORDER = ("B04", "B03", "B02", "B08")
BAND_DESCRIPTIONS = ("B04 Red", "B03 Green", "B02 Blue", "B08 NIR")
REFLECTANCE_SCALE = 10000.0


class RasterValidationError(ValueError):
    """Raised when an input GeoTIFF violates dimensional, CRS, or band constraints."""

    def __init__(self, code: ErrorCode, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class RasterValidationResult:
    data: np.ndarray  # Shape: (4, 128, 128) float32
    source_profile: dict[str, Any]
    crs: str
    bounds: Tuple[float, float, float, float]
    transform: Affine


def validate_input(file_path: Path) -> RasterValidationResult:
    """Validate that input file is a genuine four-band 128x128 10m georeferenced GeoTIFF."""
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise RasterValidationError(ErrorCode.INVALID_FILE, f"Raster file not found: {path}")

    try:
        with rasterio.open(path) as dataset:
            _validate_dataset_structure(dataset)
            raw_data = dataset.read(out_dtype=np.float32)
            _validate_reflectance_range(raw_data, dataset.nodata)

            profile = dataset.profile.copy()
            tags = dataset.tags()
            band_tags = [dataset.tags(i) for i in range(1, dataset.count + 1)]
            valid_mask = _valid_pixel_mask(raw_data, dataset.nodata)

            profile.update(
                tags=tags,
                band_tags=band_tags,
                valid_mask=valid_mask,
                crs=dataset.crs,
                transform=dataset.transform,
            )

            return RasterValidationResult(
                data=raw_data,
                source_profile=profile,
                crs=str(dataset.crs),
                bounds=tuple(dataset.bounds),
                transform=dataset.transform,
            )
    except RasterValidationError:
        raise
    except Exception as exc:
        raise RasterValidationError(ErrorCode.INVALID_FILE, f"Failed to read GeoTIFF: {str(exc)}") from exc


def normalize_reflectance(raw_data: np.ndarray) -> np.ndarray:
    """
    Clean NaN/Inf to 0.0, clip to [0, 10000], and normalize to [0.0, 1.0].
    Does NOT mutate input array.
    """
    cleaned = np.nan_to_num(raw_data, copy=True, nan=0.0, posinf=0.0, neginf=0.0)
    np.clip(cleaned, 0.0, REFLECTANCE_SCALE, out=cleaned)
    cleaned /= REFLECTANCE_SCALE
    return cleaned.astype(np.float32)


def write_super_resolved_geotiff(
    output_path: Path,
    sr_array: np.ndarray,
    source_profile: dict[str, Any],
) -> Path:
    """
    Write a four-band 2.5m super-resolved GeoTIFF preserving CRS, bounds, origin, and band descriptions.
    Affine pixel size terms are divided by 4.0.
    """
    source_height = int(source_profile.get("height", 0))
    source_width = int(source_profile.get("width", 0))
    expected_shape = (4, source_height * SCALE_FACTOR, source_width * SCALE_FACTOR)

    output = np.asarray(sr_array, dtype=np.float32)
    if tuple(output.shape) != expected_shape:
        raise ValueError(f"Expected super-resolved array shape {expected_shape}, received {tuple(output.shape)}")
    if not np.isfinite(output).all():
        raise ValueError("Super-resolved output contains non-finite values")

    transform = source_profile.get("transform")
    crs = source_profile.get("crs")
    if not isinstance(transform, Affine) or crs is None:
        raise ValueError("Source profile must contain a valid CRS and Affine transform")

    tags = dict(source_profile.get("tags", {}))
    band_tags = list(source_profile.get("band_tags", []))
    source_valid_mask = source_profile.get("valid_mask")

    profile = {
        k: v
        for k, v in source_profile.items()
        if k not in {"tags", "band_tags", "descriptions", "valid_mask"}
    }
    # Scale affine transform: pixel resolution divided by 4
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
        if source_valid_mask.shape == (source_height, source_width):
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


def generate_rgb_preview(array_4band: np.ndarray, output_png: Path) -> Path:
    """
    Generate 8-bit RGB natural-color PNG preview using 2% - 98% percentile stretching.
    Does NOT alter analytical raster values.
    """
    analytical = np.asarray(array_4band, dtype=np.float32)
    if analytical.ndim != 3 or analytical.shape[0] != 4:
        raise ValueError(f"Expected array of shape (4, H, W), got {analytical.shape}")

    # Extract RGB bands: B04 (Red), B03 (Green), B02 (Blue)
    stretched_bands = [_percentile_stretch(analytical[i]) for i in range(3)]
    rgb = np.stack(stretched_bands, axis=-1)

    destination = Path(output_png)
    destination.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgb, mode="RGB").save(destination, format="PNG")
    return destination


def process_live_geotiff(
    input_path: Path,
    output_geotiff_path: Path,
    lr_preview_path: Path,
    sr_preview_path: Path,
    adapter: Any,
) -> dict[str, Any]:
    """
    Execute full end-to-end processing pipeline on a genuine 4-band GeoTIFF.
    """
    # 1. Validate input GeoTIFF
    val_result = validate_input(input_path)

    # 2. Generate LR RGB Preview
    generate_rgb_preview(val_result.data, lr_preview_path)

    # 3. Normalize reflectance
    norm_data = normalize_reflectance(val_result.data)

    # 4. Prepare PyTorch tensor [1, 4, 128, 128]
    in_tensor = torch.from_numpy(norm_data).unsqueeze(0).float()

    # 5. Run genuine model inference [1, 4, 512, 512]
    sr_tensor = adapter.enhance(in_tensor)
    sr_array = sr_tensor.squeeze(0).numpy()

    # 6. Write super-resolved GeoTIFF
    write_super_resolved_geotiff(output_geotiff_path, sr_array, val_result.source_profile)

    # 7. Generate SR RGB Preview
    generate_rgb_preview(sr_array * REFLECTANCE_SCALE, sr_preview_path)

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


def _percentile_stretch(band: np.ndarray) -> np.ndarray:
    values = np.asarray(band, dtype=np.float32)
    finite = np.isfinite(values)
    stretched = np.zeros(values.shape, dtype=np.uint8)
    if not finite.any():
        return stretched

    low, high = np.percentile(values[finite], (2.0, 98.0))
    if not high > low:
        return stretched

    scaled = np.clip((values[finite] - low) / (high - low), 0.0, 1.0)
    stretched[finite] = np.rint(scaled * 255.0).astype(np.uint8)
    return stretched
