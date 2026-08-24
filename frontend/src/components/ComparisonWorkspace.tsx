import React, { useState, useRef, useCallback } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface ComparisonWorkspaceProps {
  job: JobDetailResponse | null;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onStartEnhance: () => void;
  loading: boolean;
  resolveAssetUrl: (path: string | null | undefined) => string;
}

export const ComparisonWorkspace: React.FC<ComparisonWorkspaceProps> = ({
  job,
  selectedFile,
  onFileSelect,
  onStartEnhance,
  loading,
  resolveAssetUrl,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = Math.round((x / rect.width) * 100);
      setSliderPos(percent);
    },
    [isDragging]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPos((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPos((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      setSliderPos(0);
    } else if (e.key === 'End') {
      setSliderPos(100);
    }
  };

  const isCompleted = job && (job.status === 'completed' || job.status === 'cached');
  const isProcessing = Boolean(job && (job.status === 'running' || job.status === 'queued')) || loading;

  const lrUrl = resolveAssetUrl(job?.previews?.lr_rgb_url);
  const srUrl = resolveAssetUrl(job?.previews?.sr_rgb_url);

  return (
    <div className="p-5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0D241A] tracking-tight">
            See the Improvement
          </h2>
          <p className="text-xs text-[#6D756F]">
            Drag the slider to compare the original and enhanced image.
          </p>
        </div>

        {/* Band Layer Toggle */}
        <div className="flex items-center bg-[#EAF0E3] p-0.5 rounded-lg border border-[#D9DDD2] self-start sm:self-auto">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold rounded-md bg-[#00613E] text-white shadow-2xs cursor-default"
          >
            Natural Color
          </button>
          <button
            type="button"
            disabled
            title="Vegetation Index (NDVI) — coming soon"
            className="px-2.5 py-1 text-xs font-normal text-slate-500 cursor-not-allowed opacity-60"
          >
            Vegetation
          </button>
          <button
            type="button"
            disabled
            title="Infrared false color — coming soon"
            className="px-2.5 py-1 text-xs font-normal text-slate-500 cursor-not-allowed opacity-60"
          >
            Infrared
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {isCompleted && lrUrl && srUrl ? (
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerUp}
          tabIndex={0}
          role="slider"
          aria-label="Before and after comparison slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={sliderPos}
          onKeyDown={handleKeyDown}
          className="relative w-full aspect-16/10 sm:aspect-16/9 rounded-xl overflow-hidden bg-slate-900 border border-[#D9DDD2] select-none touch-none cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-[#00613E]"
        >
          {/* Right/Background Image (Super-Resolved SR 2.5m) */}
          <img
            src={srUrl}
            alt="Super-resolved Sentinel-2 at 2.5m"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Left/Foreground Clipped Image (Original LR 10m) */}
          <div
            style={{ width: `${sliderPos}%` }}
            className="absolute inset-y-0 left-0 overflow-hidden"
          >
            <img
              src={lrUrl}
              alt="Original Sentinel-2 at 10m"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none max-w-none"
              style={{
                width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                height: '100%',
              }}
            />
          </div>

          {/* Vertical Divider Line */}
          <div
            style={{ left: `${sliderPos}%` }}
            className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.5)] pointer-events-none"
          >
            {/* Center Circular Handle */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-[#0D241A] shadow-md flex items-center justify-center text-xs font-bold pointer-events-none">
              <span className="text-[10px]">◀ ▶</span>
            </div>
          </div>

          {/* Bottom Left Badge */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            Before · 10 m
          </div>

          {/* Bottom Right Badge */}
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium pointer-events-none">
            After · 2.5 m
          </div>
        </div>
      ) : isProcessing ? (
        <div className="w-full aspect-16/10 sm:aspect-16/9 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2] flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="p-3.5 rounded-full bg-[#003F2D] text-[#EAF0E3]">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1 max-w-sm">
            <p className="text-sm font-semibold text-[#0D241A]">
              Super-Resolution In Progress
            </p>
            <p className="text-xs text-[#6D756F]">
              {job?.current_stage || 'Executing ESA SEN2SRLite NonReference_RGBN_x4 inference...'}
            </p>
          </div>
          <div className="w-full max-w-xs bg-slate-200 rounded-full h-2 overflow-hidden border border-[#D9DDD2]">
            <div
              className="bg-[#00613E] h-full transition-all duration-300 rounded-full"
              style={{ width: `${job?.progress_percent || 45}%` }}
            />
          </div>
        </div>
      ) : (
        /* Empty / Upload Dropzone State */
        <div className="w-full aspect-16/10 sm:aspect-16/9 rounded-xl border-2 border-dashed border-[#D9DDD2] bg-[#F8F7F1]/80 hover:bg-[#F8F7F1] flex flex-col items-center justify-center p-8 text-center space-y-3 transition-colors">
          <div className="p-3 rounded-full bg-[#EAF0E3] text-[#003F2D]">
            <Upload className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#0D241A]">
              {selectedFile ? selectedFile.name : 'Select or upload a 4-band Sentinel-2 GeoTIFF'}
            </p>
            <p className="text-xs text-[#6D756F] max-w-md">
              Must be a 128×128 pixel georeferenced raster in B04, B03, B02, B08 order at 10m resolution.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FCFBF7] border border-[#00613E] text-[#00613E] hover:bg-[#EAF0E3] cursor-pointer shadow-2xs transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Choose GeoTIFF File
              <input
                type="file"
                accept=".tif,.tiff"
                className="hidden"
                aria-label="Select GeoTIFF file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onFileSelect(e.target.files[0]);
                  }
                }}
              />
            </label>

            {selectedFile && (
              <button
                type="button"
                onClick={onStartEnhance}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer"
              >
                Run Live 4× Enhancement
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
