---
title: GeoSR SEN2SRLite API
emoji: 🛰️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Project Pheonix — SIH 2026 MVP

> Deep Learning Based Super Resolution Mapping from Medium Resolution Satellite Imagery (10 m to 2.5 m)

## Overview
Project Pheonix is a geospatial super-resolution platform designed to enhance 10 m Sentinel-2 RGB+NIR imagery to 2.5 m resolution using the official open-source ESA `SEN2SRLite` (`NonReference_RGBN_x4`) baseline architecture.

## Specifications
- [Product Requirements Document (PRD)](PRD.md)
- [Software Requirements Specification (SRS)](SRS.md)
- [System Architecture](ARCHITECTURE.md)
- [Technology Stack](TECH_STACK.md)
- [UI/UX Design](UI_UX.md)
- [Development Plan](DEVELOPMENT_PLAN.md)

## Architecture & Workflows
- **Frontend**: Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Python 3.11 + Rasterio + PyTorch + SEN2SRLite
- **Inference Scope**: Georeferenced 4-band 128×128 input patches (B04, B03, B02, B08) producing 512×512 2.5 m GeoTIFFs.
