import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ComparisonSlider } from '../components/ComparisonSlider';

describe('ComparisonSlider', () => {
  it('renders dual images and accessible range input', () => {
    render(
      <ComparisonSlider
        leftImageUrl="/lr.png"
        rightImageUrl="/sr.png"
        leftLabel="Original (10m LR)"
        rightLabel="Super-Resolved (2.5m SR)"
      />
    );

    const sliderInput = screen.getByRole('slider', { name: /comparison slider/i });
    expect(sliderInput).toBeInTheDocument();
    expect(sliderInput).toHaveAttribute('aria-valuenow', '50');
    expect(sliderInput).toHaveAttribute('aria-valuemin', '0');
    expect(sliderInput).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('Original (10m LR)')).toBeInTheDocument();
    expect(screen.getByText('Super-Resolved (2.5m SR)')).toBeInTheDocument();
  });

  it('supports keyboard navigation for accessibility', () => {
    render(
      <ComparisonSlider
        leftImageUrl="/lr.png"
        rightImageUrl="/sr.png"
      />
    );

    const sliderInput = screen.getByRole('slider', { name: /comparison slider/i });

    // Press ArrowRight to increase position by 5
    fireEvent.keyDown(sliderInput, { key: 'ArrowRight' });
    expect(sliderInput).toHaveAttribute('aria-valuenow', '55');

    // Press ArrowLeft to decrease position by 5
    fireEvent.keyDown(sliderInput, { key: 'ArrowLeft' });
    expect(sliderInput).toHaveAttribute('aria-valuenow', '50');

    // Press Home to jump to 0
    fireEvent.keyDown(sliderInput, { key: 'Home' });
    expect(sliderInput).toHaveAttribute('aria-valuenow', '0');

    // Press End to jump to 100
    fireEvent.keyDown(sliderInput, { key: 'End' });
    expect(sliderInput).toHaveAttribute('aria-valuenow', '100');
  });
});
