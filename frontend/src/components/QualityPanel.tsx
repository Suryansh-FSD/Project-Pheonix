import React from 'react';
import { ShieldCheck, Info, Database, Cpu, Layers } from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface QualityPanelProps {
  job: JobDetailResponse;
}

export const QualityPanel: React.FC<QualityPanelProps> = ({ job }) => {
  const isCached = job.cached || job.execution_mode === 'cached';
  const hasRef = job.reference_available;
  const metrics = job.metrics;
  const metadata = job.metadata;
  const provenance = job.model_provenance;

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-5 space-y-6 text-left shadow-xl">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-slate-100">Quality & Scientific Verification</h3>
        </div>

        <div className="flex items-center gap-2">
          {isCached && (
            <span
              data-testid="cached-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              Cached Demonstration — provenance pending
            </span>
          )}
          {!hasRef ? (
            <span
              data-testid="no-ref-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700"
            >
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Reference unavailable
            </span>
          ) : (
            <span
              data-testid="ref-badge"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800"
            >
              Aligned Reference Available
            </span>
          )}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Validation Metrics</h4>
        {hasRef ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">PSNR (Peak Signal-to-Noise Ratio)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {metrics?.psnr?.value !== null && metrics?.psnr?.value !== undefined
                  ? `${metrics.psnr.value.toFixed(2)} dB`
                  : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Calculated against aligned high-resolution reference.</span>
            </div>
            <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400">SSIM (Structural Similarity)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {metrics?.ssim?.value !== null && metrics?.ssim?.value !== undefined
                  ? metrics.ssim.value.toFixed(4)
                  : 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500">Structural similarity index on 4-band reflectance.</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">Ground-truth high-resolution reference is unavailable.</p>
            <p className="text-slate-500">
              In accordance with scientific integrity rules, PSNR and SSIM are never fabricated or simulated. Metrics require aligned sub-meter aerial or ground-truth reference imagery.
            </p>
          </div>
        )}
      </div>

      {/* Geospatial Metadata */}
      {metadata && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Geospatial Preservation
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block">CRS</span>
              <span className="font-mono text-slate-200 font-medium">{metadata.crs}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Pixel Size</span>
              <span className="font-mono text-slate-200 font-medium">
                {metadata.input_pixel_size_m}m → {metadata.output_pixel_size_m}m
              </span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Dimensions</span>
              <span className="font-mono text-slate-200 font-medium">
                128×128 → 512×512
              </span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block">Scale Factor</span>
              <span className="font-mono text-emerald-400 font-medium">4× Super-Resolution</span>
            </div>
          </div>
        </div>
      )}

      {/* Model Provenance */}
      {provenance && (
        <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            <span>Model: <strong className="text-slate-300">{provenance.model_name}</strong> ({provenance.model_variant})</span>
          </div>
          <div>
            <span>License: <span className="font-mono text-slate-300">{provenance.code_license}</span> | Weights: <span className="text-amber-400/90">{provenance.weights_license}</span></span>
          </div>
        </div>
      )}
    </div>
  );
};
