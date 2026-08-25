import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { useJob } from '../context/JobContext';

export const HomePage: React.FC = () => {
  const { health, activeJob, setRoute } = useJob();
  const isJobReady = activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached');

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="p-8 sm:p-10 rounded-3xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF0E3] text-[#003F2D] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Project Pheonix · Sentinel-2 4× Super-Resolution</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0D241A] leading-tight">
            Clearer, Analysis-Ready Satellite Imagery
          </h1>
          <p className="text-xs sm:text-sm text-[#6D756F] leading-relaxed">
            Enhance 10 m European Space Agency Sentinel-2 multispectral bands into crisp 2.5 m ground resolution rasters using ESA SEN2SRLite.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRoute('enhance')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-sm transition-colors cursor-pointer"
            >
              Enhance Satellite Imagery
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setRoute('help')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FCFBF7] hover:bg-[#EAF0E3] text-[#00613E] border border-[#00613E] shadow-2xs transition-colors cursor-pointer"
            >
              Documentation & Specs
            </button>
          </div>
        </div>

        {/* Backend & Model Status Card */}
        <div className="p-5 rounded-2xl bg-[#EAF0E3]/70 border border-[#D9DDD2] space-y-3 w-full md:w-80 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#003F2D] uppercase tracking-wider">Service Health</span>
            <span className={`w-2.5 h-2.5 rounded-full ${health?.backend_ready ? 'bg-[#16744A] animate-pulse' : 'bg-rose-500'}`} />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-1.5">
              <span className="text-[#6D756F]">Backend API:</span>
              <strong className="text-[#0D241A]">{health?.backend_ready ? 'Online' : 'Offline'}</strong>
            </div>
            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-1.5">
              <span className="text-[#6D756F]">Model Architecture:</span>
              <strong className="text-[#0D241A] font-mono">{health?.model_provenance?.model_name || 'SEN2SRLite'}</strong>
            </div>
            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-1.5">
              <span className="text-[#6D756F]">Model Readiness:</span>
              <strong className="text-[#0D241A]">{health?.model_ready ? 'Loaded in Memory' : 'Loads on first request'}</strong>
            </div>
            <div className="flex justify-between pb-0.5">
              <span className="text-[#6D756F]">Inference Device:</span>
              <strong className="text-[#0D241A] font-mono uppercase">{health?.device || 'cpu'}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Feature / Spec Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-2">
          <div className="p-2.5 rounded-xl bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-bold text-[#0D241A]">4× Spatial Upscaling</h3>
          <p className="text-xs text-[#6D756F]">
            Transforms 128×128 patches at 10 m ground resolution into 512×512 rasters at 2.5 m per pixel with sub-second latency.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-2">
          <div className="p-2.5 rounded-xl bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-bold text-[#0D241A]">4-Band Multispectral</h3>
          <p className="text-xs text-[#6D756F]">
            Super-resolves Red (B04), Green (B03), Blue (B02), and Near-Infrared (B08) surface reflectance simultaneously.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-2">
          <div className="p-2.5 rounded-xl bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-bold text-[#0D241A]">Geospatial Preservation</h3>
          <p className="text-xs text-[#6D756F]">
            Retains EPSG projected coordinate reference systems, bounding boxes, and affine transformations without spatial distortion.
          </p>
        </div>
      </section>

      {/* Active / Recent Job Callout */}
      {isJobReady && (
        <section className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#16744A]/10 text-[#16744A]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0D241A]">Recent Super-Resolution Job Complete</p>
              <p className="text-xs text-[#6D756F]">Job ID: <span className="font-mono">{activeJob.job_id}</span> ({activeJob.processing_duration_s?.toFixed(2)}s)</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setRoute('compare')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#EAF0E3] hover:bg-[#D9DDD2] text-[#003F2D] transition-colors cursor-pointer"
            >
              Compare Results
            </button>
            <button
              type="button"
              onClick={() => setRoute('downloads')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer"
            >
              Download GeoTIFF
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
