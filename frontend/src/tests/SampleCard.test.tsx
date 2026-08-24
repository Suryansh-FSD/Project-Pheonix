import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SampleCard } from '../components/SampleCard';
import type { SampleSummary } from '../types/api';

const mockSample: SampleSummary = {
  sample_id: 'spain_crops_01',
  name: 'Spain Agricultural Fields (Crops)',
  category: 'crop',
  location: 'Castile-La Mancha, Spain',
  input_resolution_m: 10.0,
  output_resolution_m: 2.5,
  input_dimensions: [128, 128],
  output_dimensions: [512, 512],
  has_hr_reference: true,
  reference_source: 'OpenSR Test',
  preview_url: '/thumb.png',
  license_info: {
    license: 'CC0-1.0',
    attribution: 'ESA OpenSR',
    redistribution_permitted: true,
  },
};

describe('SampleCard', () => {
  it('renders semantic buttons for selection, live enhancement, and cached execution', () => {
    const onSelect = vi.fn();
    const onRunLive = vi.fn();
    const onRunCached = vi.fn();

    render(
      <SampleCard
        sample={mockSample}
        isSelected={false}
        onSelect={onSelect}
        onRunLive={onRunLive}
        onRunCached={onRunCached}
      />
    );

    const liveBtn = screen.getByRole('button', { name: /Run Live 4x Super-Resolution/i });
    const cachedBtn = screen.getByRole('button', { name: /Load Cached Baseline/i });

    expect(liveBtn).toBeInTheDocument();
    expect(cachedBtn).toBeInTheDocument();

    fireEvent.click(liveBtn);
    expect(onRunLive).toHaveBeenCalledWith(mockSample);

    fireEvent.click(cachedBtn);
    expect(onRunCached).toHaveBeenCalledWith(mockSample);
  });
});
