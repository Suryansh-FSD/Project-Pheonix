"""
GeoSR SEN2SRLite Super-Resolution Model Adapter
Wraps the ESA OpenSR SEN2SRLite NonReference_RGBN_x4 baseline.
"""

from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
from threading import Lock
from typing import Any, Optional
import mlstac
import torch
from app.model.provenance import load_model_provenance, get_manifest_path

def _resolve_models_root() -> Path:
    if "GEOSR_MODELS_DIR" in os.environ:
        return Path(os.environ["GEOSR_MODELS_DIR"])
    local_path = Path(__file__).resolve().parents[3] / "models"
    if (local_path / "SEN2SRLite_RGBN").exists():
        return local_path
    workspace_path = Path("/Users/suryanshdixit/Desktop/VyomSight/models")
    if (workspace_path / "SEN2SRLite_RGBN").exists():
        return workspace_path
    return local_path

MODELS_ROOT = _resolve_models_root()
DEFAULT_MODEL_DIR = MODELS_ROOT / "SEN2SRLite_RGBN"
INPUT_SHAPE = (1, 4, 128, 128)
OUTPUT_SHAPE = (1, 4, 512, 512)


class ModelInferenceError(RuntimeError):
    """Raised when model inference fails or produces invalid outputs."""


class SuperResolutionModel:
    """Owns model lifecycle, device detection, manifest verification, warm-up, and real 4x inference."""

    def __init__(self) -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model: Optional[torch.nn.Module] = None
        self.last_error: Optional[Exception] = None
        self._load_lock = Lock()

    @property
    def provenance_info(self) -> dict[str, Any]:
        return load_model_provenance().model_dump()

    def verify_manifest(self, model_dir: Path) -> bool:
        """Verify all model artifact files against manifest.json SHA-256 hashes."""
        manifest_file = model_dir.parent / "manifest.json"
        if not manifest_file.exists():
            manifest_file = get_manifest_path()
        if not manifest_file.exists():
            return False

        try:
            with open(manifest_file, "r") as f:
                manifest = json.load(f)
            files = manifest.get("files", {})
            for filename, meta in files.items():
                target_file = model_dir / filename
                if not target_file.exists():
                    return False
                if target_file.stat().st_size != meta["size"]:
                    return False
                h = hashlib.sha256(target_file.read_bytes()).hexdigest()
                if h != meta["sha256"]:
                    return False
            return True
        except Exception:
            return False

    def load_model(self, weights_path: Optional[Path] = None) -> bool:
        """Load, verify, and warm up model once. Returns True if ready, False on failure."""
        with self._load_lock:
            if self.is_ready():
                return True

            self.last_error = None
            try:
                model_dir = Path(weights_path if weights_path is not None else DEFAULT_MODEL_DIR)

                if not model_dir.exists():
                    raise FileNotFoundError(f"Model artifact not found at {model_dir}")

                if not self.verify_manifest(model_dir):
                    raise RuntimeError("Model artifact failed SHA-256 manifest verification.")

                loader = mlstac.load(str(model_dir))
                if hasattr(loader, "compiled_model"):
                    compiled = loader.compiled_model(device=self.device)
                elif isinstance(loader, torch.nn.Module):
                    compiled = loader
                else:
                    raise TypeError("Loaded artifact is not a valid MLSTAC compiled model or PyTorch module")

                compiled = compiled.to(self.device)
                compiled.eval()
                self._warmup_check(compiled)
                self._model = compiled
                return True
            except Exception as exc:
                self._model = None
                self.last_error = exc
                return False

    def is_ready(self) -> bool:
        return self._model is not None

    def enhance(self, rgbn_tensor: torch.Tensor) -> torch.Tensor:
        """
        Enhance 128x128 RGBN tensor [1, 4, 128, 128] to [1, 4, 512, 512].
        Returns a float32 CPU tensor with finite values.
        """
        if not self.is_ready():
            raise ModelInferenceError("SuperResolutionModel is not loaded or ready")

        self._validate_input(rgbn_tensor)
        assert self._model is not None

        try:
            with torch.inference_mode():
                in_tensor = rgbn_tensor.to(self.device, dtype=torch.float32)
                out_tensor = self._model(in_tensor)
        except Exception as exc:
            raise ModelInferenceError(f"SEN2SRLite inference failed: {str(exc)}") from exc

        self._validate_output(out_tensor)
        return out_tensor.detach().to(device="cpu", dtype=torch.float32)

    def _warmup_check(self, model: torch.nn.Module) -> None:
        with torch.inference_mode():
            dummy = torch.zeros(INPUT_SHAPE, device=self.device, dtype=torch.float32)
            out = model(dummy)
            self._validate_output(out)

    @staticmethod
    def _validate_input(tensor: torch.Tensor) -> None:
        if not isinstance(tensor, torch.Tensor):
            raise TypeError("rgbn_tensor must be a torch.Tensor")
        if tuple(tensor.shape) != INPUT_SHAPE:
            raise ValueError(f"Expected input shape {INPUT_SHAPE}, received {tuple(tensor.shape)}")
        if not torch.isfinite(tensor).all():
            raise ValueError("Input tensor contains NaN or Inf values")

    @staticmethod
    def _validate_output(output: Any) -> None:
        if not isinstance(output, torch.Tensor):
            raise ModelInferenceError("Model output is not a torch.Tensor")
        if tuple(output.shape) != OUTPUT_SHAPE:
            raise ModelInferenceError(f"Expected output shape {OUTPUT_SHAPE}, received {tuple(output.shape)}")
        if not torch.isfinite(output).all():
            raise ModelInferenceError("Model output contains NaN or infinite values")


model_adapter = SuperResolutionModel()
