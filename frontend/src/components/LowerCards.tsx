import React from 'react';
import {
  ShieldAlert,
  Sprout,
  Calendar,
  Building2,
  CloudRain,
} from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface LowerCardsProps {
  job: JobDetailResponse | null;
}

export const LowerCards: React.FC<LowerCardsProps> = ({ job: _job }) => {
  return (
    <section aria-label="Analytical Modules" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card 1: Output Integrity & Spatial Uncertainty */}
      <div className="p-4 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-3 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#003F2D]">
            <ShieldAlert className="w-4 h-4 text-[#00613E]" />
            <h3 className="font-display text-sm font-bold text-[#0D241A]">
              Where is the result uncertain?
            </h3>
          </div>
          <p className="text-xs text-[#6D756F]">
            Review areas the model is less confident about.
          </p>
        </div>

        {/* Visual Map / Integrity Graphic Placeholder */}
        <div className="w-full h-24 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] flex flex-col items-center justify-center p-3 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#00613E_1px,transparent_1px)] [background-size:8px_8px]" />
          <div className="relative z-10 text-center space-y-1">
            <span className="text-[11px] font-semibold text-[#003F2D] block">
              128×128 (10m) → 512×512 (2.5m)
            </span>
            <span className="text-[10px] text-[#6D756F] block">
              Bands: B04 (Red), B03 (Green), B02 (Blue), B08 (NIR)
            </span>
          </div>
        </div>

        {/* Reliability Gradient Indicator */}
        <div className="space-y-1">
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-emerald-600 via-amber-400 to-rose-500" />
          <div className="flex items-center justify-between text-[10px] text-[#6D756F]">
            <span>More reliable</span>
            <span>Check carefully</span>
          </div>
        </div>
      </div>

      {/* Card 2: Analyze this area */}
      <div className="p-4 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-3 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#003F2D]">
            <Sprout className="w-4 h-4 text-[#00613E]" />
            <h3 className="font-display text-sm font-bold text-[#0D241A]">
              Analyze this area
            </h3>
          </div>
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAF0E3] text-[#003F2D] text-[11px] font-medium"
            >
              <Sprout className="w-3 h-3" />
              Crops
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-slate-400 text-[11px] cursor-not-allowed opacity-60"
            >
              <Building2 className="w-3 h-3" />
              City
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-slate-400 text-[11px] cursor-not-allowed opacity-60"
            >
              <CloudRain className="w-3 h-3" />
              Disaster
            </button>
          </div>
        </div>

        {/* Analysis Module Graphic Shell */}
        <div className="w-full h-20 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] flex items-center justify-center p-3 relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#16744A_1px,transparent_1px)] [background-size:6px_6px]" />
          <span className="text-[11px] font-medium text-[#003F2D] bg-[#FCFBF7]/90 px-2.5 py-1 rounded-full border border-[#D9DDD2]">
            Analysis modules — coming soon
          </span>
        </div>

        {/* Feature Pill Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            disabled
            className="flex-1 py-1 px-2 rounded-lg bg-[#FCFBF7] border border-[#D9DDD2] text-[10px] font-medium text-slate-500 cursor-not-allowed opacity-75"
          >
            Green Cover
          </button>
          <button
            type="button"
            disabled
            className="flex-1 py-1 px-2 rounded-lg bg-[#FCFBF7] border border-[#D9DDD2] text-[10px] font-medium text-slate-500 cursor-not-allowed opacity-75"
          >
            Field Boundaries
          </button>
          <button
            type="button"
            disabled
            className="flex-1 py-1 px-2 rounded-lg bg-[#FCFBF7] border border-[#D9DDD2] text-[10px] font-medium text-slate-500 cursor-not-allowed opacity-75"
          >
            Vegetation Health
          </button>
        </div>
      </div>

      {/* Card 3: What changed over time? */}
      <div className="p-4 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-3 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#003F2D]">
            <Calendar className="w-4 h-4 text-[#00613E]" />
            <h3 className="font-display text-sm font-bold text-[#0D241A]">
              What changed over time?
            </h3>
          </div>
          <p className="text-xs text-[#6D756F]">
            Compare two dates to find added or removed features.
          </p>
        </div>

        {/* Time Comparison Graphic Shell */}
        <div className="w-full h-20 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] flex items-center justify-center p-3 text-center">
          <p className="text-[11px] text-[#6D756F] leading-tight">
            Change detection requires multi-temporal imagery and is deferred after MVP.
          </p>
        </div>

        {/* Date Button */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full py-1.5 rounded-xl bg-[#FCFBF7] border border-[#D9DDD2] text-xs font-semibold text-slate-500 inline-flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
        >
          <Calendar className="w-3.5 h-3.5" />
          Choose Dates
        </button>
      </div>
    </section>
  );
};
