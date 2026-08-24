import React from 'react';
import { Download, HardDrive, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useJob } from '../context/JobContext';

export const DownloadsPage: React.FC = () => {
  const { recentJobs, activeJob, resolveAssetUrl, setRoute } = useJob();

  // Deduplicate and filter completed jobs
  const completedJobs = [
    ...(activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached') ? [activeJob] : []),
    ...recentJobs.filter((j) => (j.status === 'completed' || j.status === 'cached') && j.job_id !== activeJob?.job_id),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <Download className="w-7 h-7 text-[#00613E]" />
          Downloads & Exported Outputs
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Access and download super-resolved 2.5 m georeferenced GeoTIFF files generated in this session.
        </p>
      </div>

      {/* Info Callout */}
      <div className="p-4 rounded-xl bg-[#EAF0E3] border border-[#D9DDD2] flex items-start gap-3 text-xs text-[#003F2D]">
        <HardDrive className="w-4 h-4 shrink-0 mt-0.5 text-[#00613E]" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[#0D241A]">Ephemeral In-Memory Storage</p>
          <p className="text-[11px] text-[#6D756F]">
            Generated GeoTIFF files are stored temporarily on the server during the active backend session. Download your desired files to your local drive.
          </p>
        </div>
      </div>

      {completedJobs.length > 0 ? (
        <div className="space-y-3">
          {completedJobs.map((job) => {
            const geotiffUrl = job.downloads?.geotiff_url ? resolveAssetUrl(job.downloads.geotiff_url) : null;
            return (
              <div
                key={job.job_id}
                className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16744A]" />
                    <span className="font-mono font-semibold text-xs text-[#0D241A]">
                      geosr_enhanced_2_5m_{job.job_id.slice(0, 8)}.tif
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#EAF0E3] text-[#003F2D] text-[10px] font-semibold">
                      2.5 m · 512×512
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6D756F]">
                    <span>CRS: <strong className="text-[#0D241A] font-mono">{job.metadata?.crs || 'EPSG:32630'}</strong></span>
                    <span>Bands: <strong className="text-[#0D241A]">B04, B03, B02, B08</strong></span>
                    <span>Duration: <strong className="text-[#0D241A]">{job.processing_duration_s ? `${job.processing_duration_s.toFixed(2)}s` : '—'}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {geotiffUrl ? (
                    <a
                      href={geotiffUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download GeoTIFF
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-500 cursor-not-allowed"
                    >
                      Download Expired
                    </button>
                  )}

                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="PDF analytics reports are not implemented by current backend."
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 border border-[#D9DDD2] cursor-not-allowed opacity-60"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Report (Unavailable)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] text-center space-y-4 max-w-md mx-auto shadow-2xs">
          <div className="p-3.5 rounded-full bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <AlertCircle className="w-6 h-6 text-slate-400" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-[#0D241A]">No Downloads Available</h2>
            <p className="text-xs text-[#6D756F]">
              Completed super-resolved GeoTIFFs will appear here ready for one-click export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRoute('enhance')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] text-white shadow-2xs hover:bg-[#004F33] transition-colors cursor-pointer"
          >
            Start Enhancement
          </button>
        </div>
      )}
    </div>
  );
};
