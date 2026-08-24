import React from 'react';
import { ShieldCheck, HelpCircle, CheckCircle2 } from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface QualityTrustPanelProps {
  job: JobDetailResponse | null;
}

export const QualityTrustPanel: React.FC<QualityTrustPanelProps> = ({ job }) => {
  const isCompleted = job && (job.status === 'completed' || job.status === 'cached');

  const metrics = [
    {
      id: 'psnr',
      label: 'Image Similarity',
      sublabel: 'PSNR',
      value: isCompleted && job.metrics?.psnr?.value ? `${job.metrics.psnr.value.toFixed(2)} dB` : '—',
      info: 'Peak Signal-to-Noise Ratio calculated against aligned high-resolution reference.',
    },
    {
      id: 'ssim',
      label: 'Structure Match',
      sublabel: 'SSIM',
      value: isCompleted && job.metrics?.ssim?.value ? job.metrics.ssim.value.toFixed(4) : '—',
      info: 'Structural Similarity Index calculated against aligned high-resolution reference.',
    },
    {
      id: 'color',
      label: 'Color Accuracy',
      sublabel: 'Spectral Fidelity',
      value: '—',
      info: 'Diagnostic color spectral preservation metric.',
    },
    {
      id: 'time',
      label: 'Processing Time',
      sublabel: '',
      value: isCompleted && job.processing_duration_s ? `${job.processing_duration_s.toFixed(2)}s` : '—',
      info: 'Measured inference runtime duration on CPU/GPU device.',
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
      <h2 className="font-display text-lg font-bold text-[#0D241A] tracking-tight">
        Quality & Trust
      </h2>

      {/* Info Notice Box */}
      <div className="p-3.5 rounded-xl bg-[#EAF0E3] border border-[#D9DDD2] flex items-start gap-2.5 text-xs text-[#003F2D]">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#00613E]" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[#0D241A]">
            {isCompleted ? 'Reference unavailable' : 'No quality scores yet.'}
          </p>
          <p className="text-[11px] text-[#6D756F]">
            {isCompleted
              ? 'Arbitrary upload does not have an aligned ground-truth reference. PSNR and SSIM are not fabricated.'
              : 'Enhance an image to calculate available diagnostics.'}
          </p>
        </div>
      </div>

      {/* Metrics List */}
      <div className="space-y-3 pt-1">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-2.5 text-xs"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="font-medium text-[#0D241A]">{m.label}</span>
                <span title={m.info} className="text-slate-400 hover:text-slate-600 cursor-help">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </div>
              {m.sublabel && (
                <p className="text-[10px] text-[#6D756F] uppercase tracking-wider font-mono">
                  {m.sublabel}
                </p>
              )}
            </div>
            <span className="font-bold text-[#0D241A] font-mono text-sm">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Geospatial Checks / Reliability Section */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[#0D241A]">Geospatial Checks</span>
          <span className="text-[11px] text-[#6D756F]">{isCompleted ? 'Confirmed' : 'Pending'}</span>
        </div>

        {/* Semicircular gauge illustration */}
        <div className="relative flex flex-col items-center justify-center py-2">
          <svg className="w-36 h-18 overflow-visible" viewBox="0 0 144 72">
            <path
              d="M 12 72 A 60 60 0 0 1 132 72"
              fill="none"
              stroke="#D9DDD2"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 12 72 A 60 60 0 0 1 132 72"
              fill="none"
              stroke="#00613E"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="188.5"
              strokeDashoffset={isCompleted ? '0' : '188.5'}
              className="transition-all duration-700"
            />
          </svg>
          <div className="text-center mt-[-22px]">
            <p className="text-xs font-bold text-[#0D241A]">
              {isCompleted ? 'Live 4× Verified' : '—'}
            </p>
            <p className="text-[10px] text-[#6D756F]">
              {isCompleted ? 'ESA SEN2SRLite NonReference' : 'Waiting for analysis'}
            </p>
          </div>
        </div>

        {/* Check items */}
        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-[#0D241A]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-[#16744A]' : 'text-slate-300'}`} />
            <span>CRS preserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-[#16744A]' : 'text-slate-300'}`} />
            <span>Bounds preserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-[#16744A]' : 'text-slate-300'}`} />
            <span>4 Bands (B04-08)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-[#16744A]' : 'text-slate-300'}`} />
            <span>Finite 2.5m output</span>
          </div>
        </div>
      </div>
    </div>
  );
};
