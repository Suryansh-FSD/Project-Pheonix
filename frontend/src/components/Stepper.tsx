import React from 'react';
import { CheckCircle2, Layers, Cpu, Eye, Download } from 'lucide-react';

export type StepId = 'select' | 'enhance' | 'analyze' | 'export';

interface Step {
  id: StepId;
  label: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  { id: 'select', label: '1. Select', description: 'Choose sample or upload GeoTIFF', icon: Layers },
  { id: 'enhance', label: '2. Enhance', description: 'SEN2SRLite 4x (10m -> 2.5m)', icon: Cpu },
  { id: 'analyze', label: '3. Analyze', description: 'Interactive split & quality panel', icon: Eye },
  { id: 'export', label: '4. Export', description: 'Download 2.5m GeoTIFF', icon: Download },
];

interface StepperProps {
  currentStep: StepId;
  canAccessAnalyze: boolean;
  onStepClick?: (step: StepId) => void;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, canAccessAnalyze, onStepClick }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Enhancement workflow progress" className="w-full bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 my-4">
      <ol className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;
          const isNavigable = idx === 0 || (idx >= 2 && canAccessAnalyze) || isDone || isCurrent;

          return (
            <li key={step.id} className="w-full sm:w-auto">
              <button
                type="button"
                disabled={!isNavigable}
                onClick={() => isNavigable && onStepClick?.(step.id)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step.label}: ${step.description}`}
                className={`flex items-center gap-3 text-left w-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1.5 ${
                  isCurrent
                    ? 'text-emerald-400 font-semibold cursor-default'
                    : isNavigable
                    ? 'text-slate-300 hover:text-white cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all shrink-0 ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 ring-2 ring-emerald-500/30'
                      : isDone
                      ? 'border-slate-600 bg-slate-800 text-slate-300'
                      : 'border-slate-800 bg-slate-950 text-slate-600'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm">{step.label}</span>
                  <span className="text-xs text-slate-400 font-normal hidden md:inline">{step.description}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
