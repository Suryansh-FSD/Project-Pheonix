import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QualityPanel } from '../components/QualityPanel';
import type { JobDetailResponse } from '../types/api';

const baseMockJob: JobDetailResponse = {
  job_id: 'test-job-1',
  status: 'completed',
  execution_mode: 'live',
  cached: false,
  reference_available: false,
  source_type: 'upload',
  sample_id: null,
  progress_percent: 100,
  current_stage: 'Completed',
  processing_duration_s: 0.5,
  device_used: 'cpu',
  model_provenance: {
    model_name: 'SEN2SRLite',
    model_variant: 'NonReference_RGBN_x4',
    code_repository: 'https://github.com/ESAOpenSR/SEN2SR',
    artifact_uri: 'tacofoundation/sen2sr',
    artifact_revision: '1.1.0',
    artifact_sha256: 'abc',
    code_license: 'CC0-1.0',
    weights_license: 'unverified',
  },
  metadata: {
    crs: 'EPSG:32630',
    input_shape: [4, 128, 128],
    output_shape: [4, 512, 512],
    input_pixel_size_m: 10.0,
    output_pixel_size_m: 2.5,
    bounds: [350000, 4298720, 351280, 4300000],
  },
  previews: {},
  metrics: {
    psnr: { value: null, reference_available: false, label: 'PSNR', unit: 'dB', description: '' },
    ssim: { value: null, reference_available: false, label: 'SSIM', unit: '', description: '' },
    reconstruction_consistency: { value: null, reference_available: false, label: 'Consistency', unit: '', description: '' },
  },
  cache_metadata: null,
  downloads: {},
  error: null,
};

describe('QualityPanel', () => {
  it('renders "Reference unavailable" banner when reference_available is false', () => {
    render(<QualityPanel job={baseMockJob} />);
    expect(screen.getByTestId('no-ref-badge')).toHaveTextContent(/Reference unavailable/i);
    expect(screen.getByText(/Ground-truth high-resolution reference is unavailable/i)).toBeInTheDocument();
  });

  it('renders "Cached Demonstration — provenance pending" badge when job is cached', () => {
    const cachedJob: JobDetailResponse = {
      ...baseMockJob,
      status: 'cached',
      execution_mode: 'cached',
      cached: true,
    };
    render(<QualityPanel job={cachedJob} />);
    expect(screen.getByTestId('cached-badge')).toHaveTextContent(/Cached Demonstration — provenance pending/i);
  });

  it('renders PSNR and SSIM values when reference is available', () => {
    const refJob: JobDetailResponse = {
      ...baseMockJob,
      reference_available: true,
      metrics: {
        psnr: { value: 33.35, reference_available: true, label: 'PSNR', unit: 'dB', description: '' },
        ssim: { value: 0.8311, reference_available: true, label: 'SSIM', unit: '', description: '' },
        reconstruction_consistency: { value: null, reference_available: false, label: 'Consistency', unit: '', description: '' },
      },
    };
    render(<QualityPanel job={refJob} />);
    expect(screen.getByText('33.35 dB')).toBeInTheDocument();
    expect(screen.getByText('0.8311')).toBeInTheDocument();
  });
});
