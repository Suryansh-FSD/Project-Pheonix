import React from 'react';
import { Columns, Download, ArrowRight, Sparkles } from 'lucide-react';
import { useJob } from '../context/JobContext';
import { ComparisonWorkspace } from '../components/ComparisonWorkspace';
import { QualityTrustPanel } from '../components/QualityTrustPanel';

export const ComparePage: React.FC = () => {
  const { activeJob, setRoute, resolveAssetUrl, selectedFile, setSelectedFile, startEnhance, loading } = useJob();
  const isCompleted = activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
            <Columns className="w-7 h-7 text-[#00613E]" />
            Compare Results
          </h1>
          <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
            Side-by-side interactive comparison between 10 m Sentinel-2 input and 2.5 m super-resolved output.
          </p>
        </div>

        {isCompleted && activeJob.downloads?.geotiff_url && (
          <a
            href={resolveAssetUrl(activeJob.downloads.geotiff_url)}
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download 2.5m GeoTIFF
          </a>
        )}
      </div>

      {isCompleted ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <ComparisonWorkspace
              job={activeJob}
              selectedFile={selectedFile}
              onFileSelect={(f) => setSelectedFile(f)}
              onStartEnhance={() => startEnhance()}
              loading={loading}
              resolveAssetUrl={resolveAssetUrl}
            />
          </div>
          <div className="lg:col-span-1">
            <QualityTrustPanel job={activeJob} />
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] text-center space-y-4 max-w-xl mx-auto shadow-2xs">
          <div className="p-4 rounded-full bg-[#EAF0E3] text-[#003F2D] inline-flex">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-[#0D241A]">
              No Completed Enhancement Yet
            </h2>
            <p className="text-xs text-[#6D756F]">
              Upload a 4-band Sentinel-2 GeoTIFF to run 4× super-resolution and unlock full interactive visual comparison.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRoute('enhance')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-xs transition-colors cursor-pointer"
          >
            Go to Enhance Image
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
