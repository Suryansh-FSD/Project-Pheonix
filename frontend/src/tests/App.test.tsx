import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, resolveAssetUrl } from '../App';
import type { JobDetailResponse } from '../types/api';

describe('GeoSR Frontend E2E Unit Tests', () => {
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

  beforeEach(() => {
    vi.restoreAllMocks();
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
            },
          }),
        });
      }
      if (url.includes('/api/enhance')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            job_id: 'job-1234-test',
            status: 'queued',
            execution_mode: 'live',
          }),
        });
      }
      if (url.includes('/api/jobs/job-1234-test')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockCompletedJob),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('resolves relative asset URLs with VITE_API_BASE_URL prefix correctly', () => {
    expect(resolveAssetUrl('/api/jobs/123/previews/lr.png')).toBe('/api/jobs/123/previews/lr.png');
    expect(resolveAssetUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
  });

  it('renders application header and title matching design', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Enhance Satellite Imagery/i);
    expect(screen.getByText(/Turn 10 m Sentinel-2 imagery into clearer/i)).toBeInTheDocument();
  });

  it('unavailable features remain disabled with coming soon indicators', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Compare Results/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Analyze Land/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Choose Dates/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Create Report/i })).toBeDisabled();
  });

  it('shows Reference unavailable and blank PSNR/SSIM for arbitrary live upload', async () => {
    render(<App />);
    const file = new File(['fake-tif-content'], 'sample.tif', { type: 'image/tiff' });
    const input = screen.getByLabelText(/Upload GeoTIFF/i);

    fireEvent.change(input, { target: { files: [file] } });

    const runButton = screen.getByRole('button', { name: /Run Live 4× Enhancement/i });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText(/Reference unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/—/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/33.35/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0.8311/)).not.toBeInTheDocument();
  });
});
