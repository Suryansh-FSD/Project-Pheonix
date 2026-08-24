import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, resolveAssetUrl } from '../App';
import type { JobDetailResponse } from '../types/api';

describe('GeoSR Frontend Full Page & Navigation Integration Tests', () => {
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
    localStorage.clear();
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            status: 'ok',
            backend_ready: true,
            model_ready: false,
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

  it('resolves relative asset URLs with resolveAssetUrl correctly', () => {
    expect(resolveAssetUrl('/api/jobs/123/previews/lr.png')).toBe('/api/jobs/123/previews/lr.png');
    expect(resolveAssetUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
  });

  it('renders Home page with health status and lazy load model message', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Clearer, Analysis-Ready Satellite Imagery/i);
    expect(screen.getByText(/Loads on first request/i)).toBeInTheDocument();
  });

  it('Quality Check displays honest un-evaluated state before job completion', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Quality Check/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Quality & Scientific Integrity/i);
    });

    const notEvaluatedElements = screen.getAllByText(/Not evaluated/i);
    expect(notEvaluatedElements.length).toBeGreaterThanOrEqual(3);
  });

  it('navigates seamlessly across all supported pages', async () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: /Main Navigation/i });

    // Navigate to Enhance Image
    fireEvent.click(within(nav).getByRole('button', { name: /Enhance Image/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Enhance Satellite Imagery/i);
    });

    // Navigate to Compare Results
    fireEvent.click(within(nav).getByRole('button', { name: /Compare Results/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Compare Results/i);
    });

    // Navigate to Analyze Land
    fireEvent.click(within(nav).getByRole('button', { name: /Analyze Land/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Analyze Land/i);
    });

    // Navigate to Quality Check
    fireEvent.click(within(nav).getByRole('button', { name: /Quality Check/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Quality & Scientific Integrity/i);
    });

    // Navigate to Downloads
    fireEvent.click(within(nav).getByRole('button', { name: /Downloads/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Downloads/i);
    });

    // Navigate to Settings
    fireEvent.click(screen.getByRole('button', { name: /^Settings$/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Settings & Backend Configuration/i);
    });

    // Navigate to Help
    fireEvent.click(screen.getByRole('button', { name: /^Help$/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Help & Technical Documentation/i);
    });
  });

  it('unavailable features remain disabled with coming soon indicators', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Detect Changes/i })).toBeDisabled();
  });

  it('Settings connection test displays connected when health succeeds', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Settings$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Connection/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Test Connection/i }));
    await waitFor(() => {
      expect(screen.getByText(/Connected: Successfully reached GeoSR backend API/i)).toBeInTheDocument();
    });
  });

  it('restores active job from localStorage and displays outputs', async () => {
    localStorage.setItem('geosr_last_job_id', 'job-1234-test');
    localStorage.setItem('geosr_job_history_ids', JSON.stringify(['job-1234-test']));
    render(<App />);

    // Go to Downloads and verify job is present
    const nav = screen.getByRole('navigation', { name: /Main Navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /Downloads/i }));

    await waitFor(() => {
      expect(screen.getByText(/geosr_enhanced_2_5m_job-1234.tif/i)).toBeInTheDocument();
    });
  });

  it('removes stale job IDs from localStorage when API returns 404', async () => {
    localStorage.setItem('geosr_last_job_id', 'stale-job-999');
    (globalThis.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/jobs/stale-job-999')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem('geosr_last_job_id')).toBeNull();
    });
  });
});
