import React from 'react';
import { Download, FileText, CheckCircle2, HelpCircle, AlertCircle } from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface BottomActionBarProps {
  job: JobDetailResponse | null;
  backendReady: boolean;
  resolveAssetUrl: (path: string | null | undefined) => string;
}

export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  job,
  backendReady,
  resolveAssetUrl,
}) => {
  const isCompleted = job && (job.status === 'completed' || job.status === 'cached');
  const isFailed = job && job.status === 'failed';
  const isProcessing = job && (job.status === 'running' || job.status === 'queued');

  const downloadUrl = isCompleted && job?.downloads?.geotiff_url
    ? resolveAssetUrl(job.downloads.geotiff_url)
    : null;

  return (
    <>
      <footer className="w-full mt-6 py-3 px-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium text-[#0D241A]">
          {isFailed ? (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          ) : (
            <CheckCircle2
              className={`w-4 h-4 ${
                backendReady ? 'text-[#16744A]' : 'text-slate-400'
              }`}
            />
          )}
          <span>
            {isFailed
              ? 'Inference failed'
              : isProcessing
              ? 'Processing 4× super-resolution...'
              : isCompleted
              ? 'MVP Pipeline · Output Ready'
              : backendReady
              ? 'MVP Baseline · Ready'
              : 'Connecting to API...'}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FCFBF7] hover:bg-[#EAF0E3] text-[#00613E] border border-[#00613E] shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download GeoTIFF
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FCFBF7] text-slate-400 border border-[#D9DDD2] cursor-not-allowed opacity-60"
            >
              <Download className="w-4 h-4" />
              Download GeoTIFF
            </button>
          )}

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Analysis PDF report — coming soon"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] text-white shadow-2xs opacity-60 cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            Create Report
          </button>
        </div>
      </footer>

      {/* Floating Help Widget */}
      <button
        type="button"
        aria-label="Help & Documentation"
        className="fixed bottom-4 right-4 z-50 w-9 h-9 rounded-full bg-[#003F2D] text-[#EAF0E3] border border-[#002F22] shadow-lg flex items-center justify-center hover:bg-[#002F22] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00613E]"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </>
  );
};
