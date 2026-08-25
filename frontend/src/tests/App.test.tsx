import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App } from '../App';
import { resolveAssetUrl } from '../context/JobContext';
import type { JobDetailResponse, VegetationAnalysisResponse, ChangeDetectionResponse } from '../types/api';

describe('Project Phoenix Frontend Full Page & Navigation Integration Tests', () => {
  const mockCompletedJob: JobDetailResponse = {
    job_id: 'job-1234-test',
    status: 'completed',
    execution_mode: 'live',
    source_type: 'upload',
    cached: false,
    processing_duration_s: 0.85,
    progress_percent: 100,
    current_stage: 'Completed',
    sample_id: null,
    reference_available: false,
    metadata: {
      crs: 'EPSG:32630',
      input_shape: [4, 128, 128],
      output_shape: [4, 512, 512],
      input_pixel_size_m: 10.0,
      output_pixel_size_m: 2.5,
      bounds: [350000, 4300000, 351280, 4301280],
    },
    previews: {
      lr_rgb_url: '/api/jobs/job-1234-test/previews/lr_rgb.png',
      sr_rgb_url: '/api/jobs/job-1234-test/previews/sr_rgb.png',
      lr_ndvi_url: '/api/jobs/job-1234-test/previews/lr_ndvi.png',
      sr_ndvi_url: '/api/jobs/job-1234-test/previews/sr_ndvi.png',
      lr_fc_url: '/api/jobs/job-1234-test/previews/lr_fc.png',
      sr_fc_url: '/api/jobs/job-1234-test/previews/sr_fc.png',
    },
    metrics: {
      psnr: {
        value: null,
        reference_available: false,
        label: 'PSNR',
        unit: 'dB',
        description: 'Peak Signal-to-Noise Ratio',
      },
      ssim: {
        value: null,
        reference_available: false,
        label: 'SSIM',
        unit: '',
        description: 'Structural Similarity Index',
      },
      reconstruction_consistency: {
        value: null,
        reference_available: false,
        label: 'Reconstruction Consistency',
        unit: '',
        description: 'Diagnostic only',
      },
    },
    downloads: {
      geotiff_url: '/api/download/job-1234-test/geotiff',
      report_url: null,
    },
    error: null,
  };

  const mockCompletedJob2: JobDetailResponse = {
    ...mockCompletedJob,
    job_id: 'job-5678-test',
  };

  const mockVegResponse: VegetationAnalysisResponse = {
    job_id: 'job-1234-test',
    formula: '(B08 - B04) / (B08 + B04)',
    valid_pixel_count: 262144,
    min_ndvi: -0.12,
    max_ndvi: 0.88,
    mean_ndvi: 0.452,
    vegetation_fraction: 0.624,
    threshold_used: 0.3,
    lr_ndvi_url: '/api/jobs/job-1234-test/previews/lr_ndvi.png',
    sr_ndvi_url: '/api/jobs/job-1234-test/previews/sr_ndvi.png',
    statement: 'Spectral vegetation screening based on Sentinel-2 B08/B04 reflectance; not ground-truth botanical classification.',
  };

  const mockChangeResponse: ChangeDetectionResponse = {
    before_job_id: 'job-1234-test',
    after_job_id: 'job-5678-test',
    threshold: 0.15,
    valid_pixel_count: 262144,
    changed_pixel_count: 52428,
    changed_percentage: 20.0,
    vegetation_gain_percentage: 15.5,
    vegetation_loss_percentage: 4.5,
    mean_ndvi_delta: 0.082,
    change_preview_url: '/api/jobs/job-1234-test/previews/change_5678.png',
    statement: 'NDVI-based spectral change screening; not object-level or ground-truth change detection.',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'ok',
            backend_ready: true,
            model_ready: true,
            model_provenance: {
              model_name: 'SEN2SRLite',
              model_variant: 'NonReference_RGBN_x4',
              artifact_revision: 'b44156729e7b1b73764c474d5dcbaab0423841a8',
              code_license: 'CC0-1.0',
              code_repository: 'https://github.com/ESAOpenSR/SEN2SR',
            },
            version: '1.0.0',
            device: 'cpu',
          }),
        });
      }
      if (url.includes('/api/jobs/job-1234-test/analysis/vegetation')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockVegResponse),
        });
      }
      if (url.includes('/api/change-detection')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockChangeResponse),
        });
      }
      if (url.includes('/api/jobs/job-1234-test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompletedJob),
        });
      }
      if (url.includes('/api/jobs/job-5678-test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompletedJob2),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('resolves relative asset URLs with resolveAssetUrl correctly', () => {
    expect(resolveAssetUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
    const path = resolveAssetUrl('/api/jobs/123/previews/lr.png');
    expect(path).toContain('/api/jobs/123/previews/lr.png');
  });

  it('navigates to Compare Results and enables Vegetation & False Color modes after completion', async () => {
    localStorage.setItem('geosr_last_job_id', 'job-1234-test');
    render(<App />);

    const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Compare Results/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Compare Results/i);
    });

    const vegBtn = screen.getByRole('button', { name: /Vegetation \(NDVI\)/i });
    expect(vegBtn).not.toBeDisabled();
    fireEvent.click(vegBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vegetation Index Diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/62.4%/i)).toBeInTheDocument();
    });

    const fcBtn = screen.getByRole('button', { name: /False Color \(NIR\)/i });
    expect(fcBtn).not.toBeDisabled();
    fireEvent.click(fcBtn);

    await waitFor(() => {
      expect(screen.getByText(/False Color · NIR\/Red\/Green/i)).toBeInTheDocument();
    });
  });

  it('Detect Changes page requires 2 completed live observations and displays valid paired denominator', async () => {
    localStorage.setItem('geosr_last_job_id', 'job-1234-test');
    localStorage.setItem('geosr_job_history_ids', JSON.stringify(['job-1234-test', 'job-5678-test']));
    render(<App />);

    // Wait for jobs to populate
    await waitFor(() => {
      expect(screen.getAllByText(/2.5m/i).length).toBeGreaterThan(0);
    });

    const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Detect Changes/i }));

    const calcBtn = await screen.findByRole('button', { name: /Calculate Change Detection/i }, { timeout: 3000 });
    expect(calcBtn).toBeInTheDocument();

    fireEvent.click(calcBtn);

    await waitFor(() => {
      expect(screen.getByText(/\+15.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/-4.5%/i)).toBeInTheDocument();
      expect(screen.getByText(/20%/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
