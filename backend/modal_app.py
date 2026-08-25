"""
Project Pheonix Modal Serverless Deployment Configuration.
Exposes the FastAPI + SEN2SRLite backend on Modal serverless infrastructure.
"""

import os
import sys
import shutil
from pathlib import Path
import modal

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
SCRIPTS_DIR = ROOT_DIR / "scripts"
LOCAL_MANIFEST = ROOT_DIR / "models" / "manifest.json"

# 1. Define Modal App
app = modal.App("project-pheonix-backend")

# 2. Modal Volumes for persistent weights and job output storage
weights_volume = modal.Volume.from_name("project-pheonix-weights", create_if_missing=True)
outputs_volume = modal.Volume.from_name("project-pheonix-outputs", create_if_missing=True)

# 3. Modal Container Image
modal_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("gdal-bin", "libgdal-dev", "build-essential", "git")
    .pip_install(
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.28.0",
        "pydantic>=2.6.0",
        "python-multipart>=0.0.9",
        "torch>=2.2.0",
        "torchvision>=0.17.0",
        "sen2sr>=0.0.1",
        "mlstac>=0.1.0",
        "rasterio>=1.3.9",
        "numpy>=1.26.0,<2.0.0",
        "scipy>=1.12.0",
        "scikit-image>=0.22.0",
        "pillow>=10.2.0",
        "opencv-python-headless>=4.9.0",
        "matplotlib>=3.8.0",
        "reportlab>=4.1.0",
        "httpx>=0.27.0",
    )
    .add_local_file(str(LOCAL_MANIFEST), remote_path="/root/local_manifest.json")
    .add_local_dir(str(BACKEND_DIR / "app"), remote_path="/root/backend/app")
    .add_local_dir(str(SCRIPTS_DIR), remote_path="/root/scripts")
)


@app.cls(
    image=modal_image,
    volumes={
        "/root/models_volume": weights_volume,
        "/root/backend/outputs": outputs_volume,
    },
    timeout=600,
    min_containers=1,
    max_containers=1,
)
class ModalApp:
    @modal.enter()
    def setup(self):
        sys.path.insert(0, "/root")
        sys.path.insert(0, "/root/backend")

        models_volume_dir = Path("/root/models_volume")
        models_volume_dir.mkdir(parents=True, exist_ok=True)

        volume_manifest = models_volume_dir / "manifest.json"
        if not volume_manifest.exists() and Path("/root/local_manifest.json").exists():
            shutil.copy("/root/local_manifest.json", volume_manifest)

        os.environ["ENVIRONMENT"] = "production"
        os.environ["GEOSR_MODELS_DIR"] = "/root/models_volume"
        os.environ["CORS_ORIGINS"] = "https://project-pheonix-x3tf.vercel.app,https://project-pheonix.vercel.app,http://localhost:5173,http://127.0.0.1:5173"

        # Stage / Verify weights once on container volume
        try:
            from scripts.download_weights import download_and_verify
            target_dir = models_volume_dir / "SEN2SRLite_RGBN"
            print("Verifying / Downloading SEN2SRLite model weights on Modal volume...")
            if download_and_verify(target_dir):
                print("Model weights successfully verified on Modal volume.")
                weights_volume.commit()
            else:
                print("WARNING: Model weights staging failed.")
        except Exception as exc:
            print(f"WARNING: Weight staging error: {exc}")

        # Load PyTorch SEN2SRLite model into memory ONCE during container setup
        try:
            from app.model.adapter import model_adapter
            target_dir = models_volume_dir / "SEN2SRLite_RGBN"
            loaded = model_adapter.load_model(weights_path=target_dir)
            print(f"SEN2SRLite model load status in container setup: {loaded}")
        except Exception as exc:
            print(f"ERROR loading model in container setup: {exc}")

    @modal.asgi_app()
    def fastapi_backend(self):
        from app.main import app as fastapi_app
        return fastapi_app
