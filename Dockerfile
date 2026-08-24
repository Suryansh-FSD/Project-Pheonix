FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PORT=7860
ENV ENVIRONMENT=production
ENV GEOSR_MODELS_DIR=/app/models

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/uv.lock /app/backend/
RUN pip install --no-cache-dir uv \
    && cd /app/backend \
    && uv sync --frozen --no-dev

COPY backend /app/backend
COPY scripts /app/scripts
COPY models/manifest.json /app/models/manifest.json

RUN cd /app/backend \
    && uv run python ../scripts/download_weights.py

EXPOSE 7860

CMD ["sh", "-c", "cd /app/backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 7860 --workers 1"]
