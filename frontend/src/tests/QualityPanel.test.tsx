import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QualityPanel } from '../components/QualityPanel';
import type { JobDetailResponse } from '../types/api';

const mockBaseJob: JobDetailResponse = {
  job_id: 'job-123',
  status: 'completed',
  execution_mode: 'live',
  cached: false,
  reference_available: false,
  source_type: 'upload',
  sample_id: null,
  progress_percent: 100,
  current_stage: 'Completed',
  processing_duration_s: 0.85,
  device_used: 'cpu',
  model_provenance: {
    model_name: 'SEN2SRLite',
    model_variant: 'NonReference_RGBN_x4',
    code_repository: 'https://github.com/ESAOpenSR/SEN2SR',
    artifact_uri: 'tacofoundation/sen2sr/SEN2SRLite/NonReference_RGBN_x4',
    artifact_revision: null,
    artifact_sha256: null,
    code_license: 'CC0-1.0',
    weights_license: 'unverified',
  },
  metadata: {
    crs: 'EPSG:32630',
    input_shape: [4, 128, 128],
    output_shape: [4, 512, 512],
    input_pixel_size_m: 10.0,
    output_pixel_size_m: 2.5,
    bounds: [350000.0, 4300000.0, 351280.0, 4301280.0],
  },
  previews: {
    lr_rgb_url: '/api/jobs/job-123/previews/lr_rgb.png',
    sr_rgb_url: '/api/jobs/job-123/previews/sr_rgb.png',
    hr_reference_url: null,
  },
  metrics: {
    psnr: {
      value: null,
      reference_available: false,
      reference_name: null,
      label: 'PSNR',
      unit: 'dB',
      description: 'Peak Signal-to-Noise Ratio',
    },
    ssim: {
      value: null,
      reference_available: false,
      reference_name: null,
      label: 'SSIM',
      unit: '',
      description: 'Structural Similarity Index',
    },
    reconstruction_consistency: {
      value: null,
      reference_available: false,
      reference_name: null,
      label: 'Reconstruction Consistency',
      unit: '',
      description: 'Diagnostic only',
    },
  },
  cache_metadata: null,
  downloads: {
    geotiff_url: '/api/download/job-123/geotiff',
    report_url: null,
  },
  error: null,
};

describe('QualityPanel', () => {
  it('displays "Reference unavailable" and never invents PSNR when reference_available is false', () => {
    render(<QualityPanel job={mockBaseJob} />);
    expect(screen.getByTestId('no-ref-badge')).toHaveTextContent('Reference unavailable');
    expect(screen.getByText(/Ground-truth high-resolution reference is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/dB/i)).not.toBeInTheDocument();
  });

  it('displays prominent "Cached Result" badge when cached is true', () => {
    const cachedJob: JobDetailResponse = {
      ...mockBaseJob,
      cached: true,
      execution_mode: 'cached',
    };
    render(<QualityPanel job={cachedJob} />);
    expect(screen.getByTestId('cached-badge')).toHaveTextContent('Cached Result');
  });

  it('renders honest metrics when reference_available is true', () => {
    const refJob: JobDetailResponse = {
      ...mockBaseJob,
      reference_available: true,
      metrics: {
        ...mockBaseJob.metrics,
        psnr: { ...mockBaseJob.metrics.psnr, value: 34.56, reference_available: true },
        ssim: { ...mockBaseJob.metrics.ssim, value: 0.8912, reference_available: true },
      },
    };
    render(<QualityPanel job={refJob} />);
    expect(screen.getByText('34.56 dB')).toBeInTheDocument();
    expect(screen.getByText('0.8912')).toBeInTheDocument();
  });
});
