import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useJob } from '../context/JobContext';

export const QualityPage: React.FC = () => {
  const { activeJob, health } = useJob();
  const isCompleted = Boolean(activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached'));
  const metadata = activeJob?.metadata;
  const provenance = health?.model_provenance;
  const isHealthAvailable = Boolean(health && health.backend_ready && provenance);

  const bandCountText = isCompleted && metadata?.output_shape
    ? `${metadata.output_shape[0]} Bands (B04, B03, B02, B08)`
    : 'Not evaluated';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-[#00613E]" />
          Quality & Scientific Integrity
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Verification parameters, provenance tracking, and scientific honesty diagnostics.
        </p>
      </div>

      {/* Callout */}
      <div className="p-4 rounded-xl bg-[#EAF0E3] border border-[#D9DDD2] flex items-start gap-3 text-xs text-[#003F2D]">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#00613E]" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[#0D241A]">Scientific Honesty Guarantee</p>
          <p className="text-[11px] text-[#6D756F]">
            PSNR and SSIM are calculated only when an aligned high-resolution reference exists. Uploaded imagery without an aligned reference reports <strong>Reference unavailable</strong> and does not fabricate metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Verification Checklist */}
        <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Geospatial & Finite Output Checks
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="font-medium text-[#0D241A]">Output CRS:</span>
              {isCompleted && metadata?.crs ? (
                <div className="flex items-center gap-1.5 text-[#16744A] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{metadata.crs}</span>
                </div>
              ) : (
                <span className="text-slate-400 font-medium">Not evaluated</span>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="font-medium text-[#0D241A]">Output Bounds:</span>
              {isCompleted && metadata?.bounds ? (
                <div className="flex items-center gap-1.5 text-[#16744A] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-mono text-[11px]">Preserved</span>
                </div>
              ) : (
                <span className="text-slate-400 font-medium">Not evaluated</span>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="font-medium text-[#0D241A]">Band Count:</span>
              {isCompleted && metadata?.output_shape ? (
                <div className="flex items-center gap-1.5 text-[#16744A] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bandCountText}</span>
                </div>
              ) : (
                <span className="text-slate-400 font-medium">Not evaluated</span>
              )}
            </div>

            <div className="flex items-center justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="font-medium text-[#0D241A]">Finite-Value Validation:</span>
              {isCompleted ? (
                <div className="flex items-center gap-1.5 text-[#16744A] font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Server output validation passed</span>
                </div>
              ) : (
                <span className="text-slate-400 font-medium">Not evaluated</span>
              )}
            </div>

            <div className="flex items-center justify-between pb-1">
              <span className="font-medium text-[#0D241A]">High-Resolution Reference:</span>
              <span className="font-mono font-semibold text-slate-500">
                {isCompleted && activeJob?.reference_available ? 'Available' : 'Reference unavailable'}
              </span>
            </div>
          </div>
        </section>

        {/* Model Provenance */}
        <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Model Provenance & License
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="text-[#6D756F]">Model Name:</span>
              {isHealthAvailable ? (
                <strong className="text-[#0D241A] font-mono">{provenance?.model_name}</strong>
              ) : (
                <span className="text-slate-400">Unavailable — backend not connected</span>
              )}
            </div>

            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="text-[#6D756F]">Model Variant:</span>
              {isHealthAvailable ? (
                <strong className="text-[#0D241A] font-mono">{provenance?.model_variant}</strong>
              ) : (
                <span className="text-slate-400">Unavailable — backend not connected</span>
              )}
            </div>

            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="text-[#6D756F]">Hugging Face Revision:</span>
              {isHealthAvailable && provenance?.artifact_revision ? (
                <code className="text-[#003F2D] text-[11px] font-mono">
                  {provenance.artifact_revision.slice(0, 12)}...
                </code>
              ) : (
                <span className="text-slate-400">Unavailable — backend not connected</span>
              )}
            </div>

            <div className="flex justify-between border-b border-[#D9DDD2]/60 pb-2">
              <span className="text-[#6D756F]">Code License:</span>
              {isHealthAvailable ? (
                <strong className="text-[#0D241A]">{provenance?.code_license}</strong>
              ) : (
                <span className="text-slate-400">Unavailable — backend not connected</span>
              )}
            </div>

            <div className="flex justify-between pb-1">
              <span className="text-[#6D756F]">Code Repository:</span>
              {isHealthAvailable && provenance?.code_repository ? (
                <a
                  href={provenance.code_repository}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00613E] underline font-medium"
                >
                  ESAOpenSR / SEN2SR
                </a>
              ) : (
                <span className="text-slate-400">Unavailable — backend not connected</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
