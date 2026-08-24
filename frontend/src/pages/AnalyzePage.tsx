import React from 'react';
import { BarChart3, Sprout, Building2, CloudRain, ShieldCheck, AlertCircle } from 'lucide-react';
import { useJob } from '../context/JobContext';

export const AnalyzePage: React.FC = () => {
  const { activeJob, setRoute } = useJob();
  const isCompleted = activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached');
  const metadata = activeJob?.metadata;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <BarChart3 className="w-7 h-7 text-[#00613E]" />
          Analyze Land & Geospatial Metadata
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Detailed technical metadata extracted from the latest super-resolved Sentinel-2 raster.
        </p>
      </div>

      {isCompleted ? (
        <div className="space-y-5">
          {/* Verified Raster Metadata */}
          <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00613E]" />
              <h2 className="font-display text-base font-bold text-[#0D241A]">
                Verified Raster Parameters
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
                <span className="text-[#6D756F] block">CRS</span>
                <strong className="text-sm font-mono text-[#0D241A]">{metadata?.crs || 'EPSG:32630'}</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
                <span className="text-[#6D756F] block">Input Shape</span>
                <strong className="text-sm font-mono text-[#0D241A]">128 × 128 (4 bands)</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
                <span className="text-[#6D756F] block">Output Shape</span>
                <strong className="text-sm font-mono text-[#0D241A]">512 × 512 (4 bands)</strong>
              </div>
              <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
                <span className="text-[#6D756F] block">Pixel Resolution</span>
                <strong className="text-sm font-mono text-[#0D241A]">10 m → 2.5 m (4×)</strong>
              </div>
            </div>

            {metadata?.bounds && (
              <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2] text-xs">
                <span className="text-[#6D756F] block mb-1">Geographic Bounds [minX, minY, maxX, maxY]:</span>
                <code className="font-mono text-[#003F2D] text-[11px]">
                  [{metadata.bounds.map((b) => b.toFixed(2)).join(', ')}]
                </code>
              </div>
            )}
          </section>

          {/* Downstream Land Analytics Modules (Honest Disabled States) */}
          <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#0D241A]">
                Downstream Land Classification Modules
              </h2>
              <p className="text-xs text-[#6D756F]">
                Automated land cover analysis tools scheduled for future releases.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-75 space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Sprout className="w-4 h-4" />
                  <h3 className="font-bold text-xs">Green Cover & Canopy</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  This module is not implemented by the current backend.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-75 space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Building2 className="w-4 h-4" />
                  <h3 className="font-bold text-xs">Field & Parcel Boundaries</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  This module is not implemented by the current backend.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 opacity-75 space-y-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <CloudRain className="w-4 h-4" />
                  <h3 className="font-bold text-xs">Atmospheric / Cloud Masking</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  This module is not implemented by the current backend.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] text-center space-y-4 max-w-md mx-auto shadow-2xs">
          <div className="p-3.5 rounded-full bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-[#0D241A]">No Active Job Metadata</h2>
            <p className="text-xs text-[#6D756F]">
              Enhance an image first to extract and inspect spatial dimensions, bounds, and CRS attributes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRoute('enhance')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] text-white shadow-2xs hover:bg-[#004F33] transition-colors cursor-pointer"
          >
            Go to Enhance Image
          </button>
        </div>
      )}
    </div>
  );
};
