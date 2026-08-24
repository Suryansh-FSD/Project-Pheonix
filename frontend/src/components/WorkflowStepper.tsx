import React from 'react';
import { Check } from 'lucide-react';

export type StepId = 'select' | 'enhance' | 'analyze' | 'export';

interface WorkflowStepperProps {
  currentStep: StepId;
  canAccessAnalyze: boolean;
  onStepClick: (step: StepId) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStep,
  canAccessAnalyze,
  onStepClick,
}) => {
  const steps: { id: StepId; label: string; num: number }[] = [
    { id: 'select', label: 'Select Image', num: 1 },
    { id: 'enhance', label: 'Enhance', num: 2 },
    { id: 'analyze', label: 'Analyze', num: 3 },
    { id: 'export', label: 'Export', num: 4 },
  ];

  const getStepIndex = (s: StepId) => steps.findIndex((x) => x.id === s);
  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Workflow progress" className="w-full py-2">
      <div className="flex items-center justify-between max-w-xl mx-auto relative">
        {steps.map((step, idx) => {
          const isPassed = currentIndex > idx;
          const isCurrent = currentStep === step.id;
          const isAccessible = idx <= currentIndex || (idx === 2 && canAccessAnalyze) || (idx === 3 && canAccessAnalyze);

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => onStepClick(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex items-center gap-2 group transition-all ${
                  isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isPassed
                      ? 'bg-[#00613E] text-white'
                      : isCurrent
                      ? 'bg-[#003F2D] text-white ring-4 ring-[#EAF0E3]'
                      : 'border border-[#D9DDD2] bg-[#FCFBF7] text-slate-500'
                  }`}
                >
                  {isPassed ? <Check className="w-3.5 h-3.5 stroke-3" /> : step.num}
                </div>
                <span
                  className={`text-xs ${
                    isCurrent ? 'font-bold text-[#0D241A]' : 'font-medium text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px bg-[#D9DDD2] mx-3" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
