import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonWorkspace } from '../components/ComparisonWorkspace';
import type { JobDetailResponse } from '../types/api';

describe('ComparisonWorkspace', () => {
  const mockCompletedJob: JobDetailResponse = {
    job_id: 'job-test',
    status: 'completed',
    execution_mode: 'live',
    source_type: 'upload',
    cached: false,
    processing_duration_s: 0.5,
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
      lr_rgb_url: '/api/jobs/job-test/previews/lr_rgb.png',
      sr_rgb_url: '/api/jobs/job-test/previews/sr_rgb.png',
    },
    metrics: {
      psnr: { value: null, reference_available: false, label: 'PSNR', unit: 'dB', description: '' },
      ssim: { value: null, reference_available: false, label: 'SSIM', unit: '', description: '' },
      reconstruction_consistency: { value: null, reference_available: false, label: '', unit: '', description: '' },
    },
    downloads: { geotiff_url: '/api/download/job-test/geotiff', report_url: null },
    error: null,
  };

  it('renders upload dropzone when no job is present', () => {
    render(
      <ComparisonWorkspace
        job={null}
        selectedFile={null}
        onFileSelect={vi.fn()}
        onStartEnhance={vi.fn()}
        loading={false}
        resolveAssetUrl={(u) => u || ''}
      />
    );

    expect(screen.getByText(/See the Improvement/i)).toBeInTheDocument();
    expect(screen.getByText(/Select or upload a 4-band Sentinel-2 GeoTIFF/i)).toBeInTheDocument();
  });

  it('supports keyboard slider interaction when job is completed', () => {
    render(
      <ComparisonWorkspace
        job={mockCompletedJob}
        selectedFile={null}
        onFileSelect={vi.fn()}
        onStartEnhance={vi.fn()}
        loading={false}
        resolveAssetUrl={(u) => u || ''}
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '45');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });
});
