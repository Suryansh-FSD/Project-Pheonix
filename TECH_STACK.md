# GeoSR Technology Stack

## 1. Stack policy

The MVP must run without paid services, paid API keys, or mandatory cloud resources. Dependencies must be open source or freely licensed for the intended hackathon use. Package versions should be locked only after the complete local workflow is verified.

## 2. Selected stack

| Layer | Selection | Use |
| --- | --- | --- |
| Language | TypeScript | Frontend |
| Framework | React with Vite | Dashboard application |
| Styling | Tailwind CSS | Layout and design tokens |
| Accessible UI | shadcn/ui primitives | Buttons, dialogs, tabs, cards and forms |
| Visual polish | Componentry and Framer Motion | Small optional animations |
| Icons | Lucide React | Consistent line icons |
| Mapping | MapLibre GL JS | Interactive map |
| Basemap | OpenFreeMap | Free OpenStreetMap-based tiles |
| Language | Python 3.11 | Backend and ML |
| API | FastAPI and Uvicorn | Local HTTP service |
| Validation | Pydantic | Request and response schemas |
| Model | ESA SEN2SRLite NonReference_RGBN_x4 | 10 m to 2.5 m RGB+NIR SR |
| Runtime | PyTorch | CPU or CUDA inference |
| Model packaging | mlstac | Model download and loading |
| Geospatial IO | Rasterio and GDAL | GeoTIFF, CRS and transforms |
| Numerical | NumPy and SciPy | Array processing |
| Image metrics | scikit-image | PSNR and SSIM |
| Image utilities | Pillow and OpenCV | Previews and masks |
| Benchmark data | OpenSR Test | Paired 2.5 m validation samples |
| Report generation | ReportLab | PDF reports |
| Backend tests | pytest | Unit and integration tests |
| Frontend tests | Vitest and Testing Library | Component tests |
| Package manager | pnpm | Frontend dependency management |
| Python manager | uv | Virtual environment and lockfile |
| Source control | Git and GitHub | Collaboration |

## 3. Model selection

### 3.1 MVP model

Use ESA SEN2SRLite NonReference_RGBN_x4.

- Input bands: B04, B03, B02, B08.
- Input resolution: 10 m.
- Output resolution: 2.5 m.
- Scale: 4x.
- Input tensor: RGB+NIR.
- Output tensor: RGB+NIR.
- Code license: CC0-1.0.
- CPU fallback: required.

Official project: https://github.com/ESAOpenSR/SEN2SR

### 3.2 Models not selected for tomorrow

| Model | Reason |
| --- | --- |
| Full SEN2SR with Mamba | CUDA 12+ setup is unnecessary for MVP |
| LDSR-S2 diffusion | Higher inference cost and integration risk |
| Real-ESRGAN | Generic image restoration, not the primary scientific model |
| Swin2-MoSE Sen2Venus 4x | Its 4x Sen2Venus configuration does not directly prove 10 m RGBN to 2.5 m for this workflow |

Real-ESRGAN may be retained only as a clearly labeled visual baseline, never as the final Sentinel-2 scientific claim.

## 4. Data sources

### 4.1 MVP validation

Use OpenSR Test:

- Spain Crops, x4, 2.5 m reference.
- Spain Urban, x4, 2.5 m reference.
- Optionally SPOT or NAIP for additional testing.

Official project: https://github.com/ESAOpenSR/opensr-test

### 4.2 Future live data

Use Copernicus Data Space Ecosystem for Sentinel-2 search and download.

- Official APIs: https://documentation.dataspace.copernicus.eu/APIs.html
- Registration and OAuth are required.
- Live acquisition is not part of tomorrow's critical path.

## 5. Frontend dependency policy

### 5.1 shadcn/ui

Use for functional components:

- Button
- Card
- Tabs
- Dialog
- Tooltip
- Progress
- Select
- Alert
- Sheet
- Skeleton

### 5.2 Componentry

Componentry provides free copy-paste React components built with TypeScript, Tailwind, and Framer Motion. Use it selectively for:

- Heading entrance.
- Subtle card hover.
- Lightweight transition between result states.

Do not use heavy WebGL backgrounds, image trails, matrix effects, or animated shaders in the dashboard. They reduce usability and compete with map and image rendering.

Componentry registry configuration:

~~~json
{
  "registries": {
    "@componentry": "https://componentry.fun/r/{name}.json"
  }
}
~~~

Review the license attached to each copied component. Componentry states that component code is generally MIT unless otherwise specified; the website branding and design itself should not be copied.

## 6. Backend packages

Recommended MVP dependency groups:

~~~text
fastapi
uvicorn
pydantic
python-multipart
torch
torchvision
sen2sr
mlstac
rasterio
numpy
scipy
scikit-image
pillow
opencv-python-headless
reportlab
pytest
httpx
~~~

The optional cubo dependency is required only when directly acquiring a data cube through the model examples. Local GeoTIFF processing should not depend on a live data service.

## 7. Development commands

### 7.1 Frontend

~~~sh
pnpm install
pnpm dev
pnpm test
pnpm build
~~~

### 7.2 Backend

~~~sh
uv sync
uv run fastapi dev app/main.py
uv run pytest
~~~

Exact commands may be wrapped by repository scripts after the project structure is created.

## 8. Free mapping

MapLibre GL JS renders the interactive map. OpenFreeMap provides a free OpenStreetMap-derived style and public tile service.

- MapLibre: https://www.maplibre.org/maplibre-gl-js/docs/
- OpenFreeMap: https://openfreemap.org/

The MVP should not require commercial Mapbox, Google Maps, or ArcGIS keys.

## 9. Storage and database

### 9.1 MVP

- Bundled inputs in data/demo.
- Model weights in models, excluded from Git when large.
- Per-job files in outputs/jobs/{job_id}.
- In-memory job metadata.

### 9.2 Deferred

A database is unnecessary for the internal MVP. If persistence becomes necessary later, PostgreSQL with PostGIS is the preferred open-source option.

## 10. Hosting

### 10.1 Guaranteed zero-cost option

Run frontend and backend locally on the presentation laptop. Pre-download dependencies and model weights.

### 10.2 Optional later options

- Static frontend on a free static host.
- Public inference on a community grant or free shared compute when available.
- Local Docker deployment.

Do not promise permanent free online GPU inference. Free quotas and eligibility can change.

## 11. Training and experimentation

Use free Google Colab or Kaggle notebooks for experiments, subject to changing quotas. Training is not required for the internal MVP.

When team training begins:

- Split data geographically, not by neighboring random patches.
- Keep an untouched region-level test set.
- Record dataset versions and preprocessing.
- Compare against bicubic and the pretrained baseline.

## 12. Licensing checklist

Before submission:

- Record the license of every model and dataset.
- Preserve required notices.
- Attribute ESA OpenSR, Sentinel-2/Copernicus, map data, and benchmark datasets.
- Verify each copied Componentry item.
- Do not redistribute restricted high-resolution imagery.
- Do not commit Copernicus or hosting credentials.

## 13. Stack freeze criteria

Create lockfiles only after:

1. Model loads on the presentation laptop.
2. One sample runs end-to-end.
3. GeoTIFF output is valid.
4. Frontend production build succeeds.
5. Tests pass.

After that point, avoid dependency upgrades before the presentation.

