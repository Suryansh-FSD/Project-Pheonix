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
  onStepClick?: (step: StepId) => void;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, onStepClick }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav aria-label="Enhancement workflow progress" className="w-full bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 my-4">
      <ol className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <li
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-3 w-full sm:w-auto cursor-pointer ${
                isCurrent ? 'text-emerald-400 font-semibold' : isDone ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-950/80 text-emerald-400 ring-2 ring-emerald-500/30'
                    : isDone
                    ? 'border-slate-600 bg-slate-800 text-slate-300'
                    : 'border-slate-800 bg-slate-950 text-slate-600'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Icon className="w-5 h-5" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm">{step.label}</span>
                <span className="text-xs text-slate-400 font-normal hidden md:inline">{step.description}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
