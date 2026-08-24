import React, { useState, useEffect } from 'react';
import { GitCompare, AlertTriangle, ArrowRight, CheckCircle2, Sliders } from 'lucide-react';
import { useJob } from '../context/JobContext';
import type { ChangeDetectionResponse } from '../types/api';

export const DetectChangesPage: React.FC = () => {
  const { recentJobs, runChangeDetection, resolveAssetUrl, setRoute } = useJob();

  // Strictly filter completed live enhancement jobs (no cached jobs)
  const completedLiveJobs = recentJobs.filter(
    (j) => j.status === 'completed' && j.execution_mode === 'live' && !j.cached
  );

  const [beforeJobId, setBeforeJobId] = useState<string>('');
  const [afterJobId, setAfterJobId] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(0.15);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ChangeDetectionResponse | null>(null);

  useEffect(() => {
    if (completedLiveJobs.length >= 2) {
      if (!beforeJobId || !afterJobId || beforeJobId === afterJobId) {
        setBeforeJobId(completedLiveJobs[0].job_id);
        setAfterJobId(completedLiveJobs[1].job_id);
      }
    } else if (completedLiveJobs.length === 1) {
      setBeforeJobId(completedLiveJobs[0].job_id);
    }
  }, [completedLiveJobs, beforeJobId, afterJobId]);

  const activeBeforeId = beforeJobId || completedLiveJobs[0]?.job_id || '';
  const activeAfterId = afterJobId || (completedLiveJobs.length > 1 ? completedLiveJobs[1]?.job_id : '');

  const handleRunChangeDetection = async () => {
    const bId = activeBeforeId;
    const aId = activeAfterId;

    if (!bId || !aId) {
      setErrorMsg('Please select both a Before and an After observation.');
      return;
    }
    if (bId === aId) {
      setErrorMsg('Before and After must be two different observations.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await runChangeDetection({
        before_job_id: bId,
        after_job_id: aId,
        threshold: threshold,
      });
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compute change detection.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const beforeJob = completedLiveJobs.find((j) => j.job_id === activeBeforeId);
  const afterJob = completedLiveJobs.find((j) => j.job_id === activeAfterId);

  const renderMetadata = (job: typeof beforeJob) => {
    if (!job || !job.metadata) {
      return <p className="text-[11px] text-slate-400 italic">Metadata unavailable</p>;
    }
    const { crs, output_shape, output_pixel_size_m, bounds } = job.metadata;
    return (
      <div className="text-[11px] text-[#6D756F] space-y-0.5 pt-1 font-mono">
        <p>CRS: <span className="text-[#0D241A]">{crs || 'Metadata unavailable'}</span></p>
        <p>Shape: <span className="text-[#0D241A]">{output_shape ? `${output_shape[1]} × ${output_shape[2]}` : 'Metadata unavailable'}</span></p>
        <p>Resolution: <span className="text-[#0D241A]">{output_pixel_size_m ? `${output_pixel_size_m}m` : 'Metadata unavailable'}</span></p>
        {bounds && (
          <p className="truncate text-[10px] text-slate-500">
            Bounds: [{bounds.map((b) => b.toFixed(1)).join(', ')}]
          </p>
        )}
      </div>
    );
  };

  if (completedLiveJobs.length < 2) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
            <GitCompare className="w-7 h-7 text-[#00613E]" />
            Two-Image Change Detection
          </h1>
          <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
            Screen multi-temporal vegetation change between two spatially aligned 2.5m super-resolved observations.
          </p>
        </div>

        <div className="p-8 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs text-center space-y-4 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF0E3] flex items-center justify-center mx-auto text-[#00613E]">
            <GitCompare className="w-6 h-6" />
          </div>
          <h2 className="font-display text-lg font-bold text-[#0D241A]">
            Two Completed Observations Required
          </h2>
          <p className="text-xs text-[#6D756F] leading-relaxed">
            Two completed, spatially aligned images are required.
            Enhance the first and second observations before running change detection.
          </p>
          <button
            type="button"
            onClick={() => setRoute('enhance')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer"
          >
            Go to Enhance Image
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <GitCompare className="w-7 h-7 text-[#00613E]" />
          Two-Image Change Detection
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Compare NDVI spectral difference between two aligned 2.5m GeoTIFF observations.
        </p>
      </div>

      {/* Observation Selector Card */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-5">
        <h2 className="font-display text-base font-bold text-[#0D241A]">
          Select Aligned Live Observations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Before Job Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-[#0D241A] block">
              1. Baseline (Before) Observation:
            </label>
            <select
              value={activeBeforeId}
              onChange={(e) => setBeforeJobId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#D9DDD2] text-xs font-mono text-[#0D241A] focus:outline-none focus:ring-2 focus:ring-[#00613E]"
            >
              {completedLiveJobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  Job {j.job_id.slice(0, 8)} ({j.metadata?.crs || 'Metadata unavailable'})
                </option>
              ))}
            </select>
            {renderMetadata(beforeJob)}
          </div>

          {/* After Job Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-[#0D241A] block">
              2. Comparison (After) Observation:
            </label>
            <select
              value={activeAfterId}
              onChange={(e) => setAfterJobId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#D9DDD2] text-xs font-mono text-[#0D241A] focus:outline-none focus:ring-2 focus:ring-[#00613E]"
            >
              {completedLiveJobs.map((j) => (
                <option key={j.job_id} value={j.job_id}>
                  Job {j.job_id.slice(0, 8)} ({j.metadata?.crs || 'Metadata unavailable'})
                </option>
              ))}
            </select>
            {renderMetadata(afterJob)}
          </div>
        </div>

        {/* Threshold Slider */}
        <div className="p-3.5 rounded-xl bg-[#EAF0E3]/50 border border-[#D9DDD2] space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-[#0D241A] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#00613E]" />
              Spectral Change Threshold (|ΔNDVI|):
            </span>
            <span className="font-mono font-bold text-[#00613E]">{threshold.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.40"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-[#00613E] cursor-pointer"
          />
          <p className="text-[11px] text-[#6D756F]">
            Only paired valid pixels where |NDVI_after - NDVI_before| ≥ {threshold.toFixed(2)} are classified as spectral change.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Change Detection Failed</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleRunChangeDetection}
          disabled={loading || activeBeforeId === activeAfterId}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <GitCompare className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Screening Spectral Change...' : 'Calculate Change Detection'}
        </button>
      </section>

      {/* Results Workspace */}
      {result && (
        <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0D241A]">
                Spectral Change Map
              </h2>
              <p className="text-[11px] text-[#6D756F]">
                Observation {result.before_job_id.slice(0, 8)} ➔ {result.after_job_id.slice(0, 8)} (Threshold: {result.threshold} · Valid Paired Pixels: {result.valid_pixel_count.toLocaleString()})
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16744A] bg-[#EAF0E3] px-2.5 py-1 rounded-full border border-[#D9DDD2]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Screening Complete
            </span>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 text-[11px] block">Vegetation Gain</span>
              <strong className="text-emerald-900 font-mono text-base">+{result.vegetation_gain_percentage}%</strong>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-rose-800 text-[11px] block">Vegetation Loss</span>
              <strong className="text-rose-900 font-mono text-base">-{result.vegetation_loss_percentage}%</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
              <span className="text-[#6D756F] text-[11px] block">Total Changed (of Valid)</span>
              <strong className="text-[#0D241A] font-mono text-base">{result.changed_percentage}%</strong>
            </div>
            <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]">
              <span className="text-[#6D756F] text-[11px] block">Mean ΔNDVI</span>
              <strong className="text-[#0D241A] font-mono text-base">
                {result.mean_ndvi_delta >= 0 ? `+${result.mean_ndvi_delta}` : result.mean_ndvi_delta}
              </strong>
            </div>
          </div>

          {/* Map Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-[#D9DDD2] bg-slate-900 aspect-square max-w-lg mx-auto flex items-center justify-center">
            <img
              src={resolveAssetUrl(result.change_preview_url)}
              alt="Multi-temporal spectral change detection preview"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Legend & Scientific Disclaimer */}
          <div className="space-y-2 border-t border-[#D9DDD2]/60 pt-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-[#0D241A]">Legend:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-xs bg-emerald-500" />
                <span>Vegetation Gain (ΔNDVI ≥ +{result.threshold})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-xs bg-rose-500" />
                <span>Vegetation Loss (ΔNDVI ≤ -{result.threshold})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-xs bg-slate-500/40 border border-slate-400" />
                <span>No Significant Change</span>
              </div>
            </div>

            <p className="text-[11px] text-[#6D756F] italic">
              {result.statement} Statistics denominator strictly consists of {result.valid_pixel_count.toLocaleString()} valid paired pixels.
            </p>
          </div>
        </section>
      )}
    </div>
  );
};
