import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Stepper } from '../components/Stepper';

describe('Stepper', () => {
  it('renders all 4 workflow steps as semantic buttons', () => {
    render(<Stepper currentStep="select" canAccessAnalyze={false} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(screen.getByRole('button', { name: /Step 1\. Select/i })).toBeInTheDocument();
  });

  it('disables Analyze and Export navigation when canAccessAnalyze is false', () => {
    const onStepClick = vi.fn();
    render(<Stepper currentStep="select" canAccessAnalyze={false} onStepClick={onStepClick} />);

    const analyzeBtn = screen.getByRole('button', { name: /Step 3\. Analyze/i });
    expect(analyzeBtn).toBeDisabled();

    fireEvent.click(analyzeBtn);
    expect(onStepClick).not.toHaveBeenCalled();
  });

  it('enables Analyze and Export navigation when canAccessAnalyze is true', () => {
    const onStepClick = vi.fn();
    render(<Stepper currentStep="select" canAccessAnalyze={true} onStepClick={onStepClick} />);

    const analyzeBtn = screen.getByRole('button', { name: /Step 3\. Analyze/i });
    expect(analyzeBtn).not.toBeDisabled();

    fireEvent.click(analyzeBtn);
    expect(onStepClick).toHaveBeenCalledWith('analyze');
  });
});
