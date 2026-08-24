import React from 'react';
import { Database, MapPin, Sparkles } from 'lucide-react';
import type { SampleSummary } from '../types/api';

interface SampleCardProps {
  sample: SampleSummary;
  isSelected: boolean;
  onSelect: (sample: SampleSummary) => void;
  onRunCached: (sample: SampleSummary) => void;
  onRunLive: (sample: SampleSummary) => void;
  disabled?: boolean;
}

export const SampleCard: React.FC<SampleCardProps> = ({
  sample,
  isSelected,
  onSelect,
  onRunCached,
  onRunLive,
  disabled = false,
}) => {
  return (
    <div
      onClick={() => onSelect(sample)}
      className={`group relative rounded-xl border transition-all duration-200 text-left p-4 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'border-emerald-500 bg-slate-900/90 shadow-lg ring-1 ring-emerald-500/50'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
            {sample.name}
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            {sample.sample_id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{sample.location}</span>
          <span className="text-slate-600">•</span>
          <span className="capitalize text-emerald-400/80">{sample.category}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRunLive(sample);
          }}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-all disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Live 4×
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRunCached(sample);
          }}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all disabled:opacity-50"
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          Cached
        </button>
      </div>
    </div>
  );
};
