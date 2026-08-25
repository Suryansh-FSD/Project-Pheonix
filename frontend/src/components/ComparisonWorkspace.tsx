import React, { useState, useEffect } from 'react';
import { Layers, Sprout, Upload } from 'lucide-react';
import type { JobDetailResponse, LayerViewMode, VegetationAnalysisResponse } from '../types/api';
import { ComparisonSlider } from './ComparisonSlider';
import { useJob } from '../context/JobContext';

export interface ComparisonWorkspaceProps {
  job: JobDetailResponse | null;
  selectedFile?: File | null;
  onFileSelect?: (file: File | null) => void;
  onStartEnhance?: (file?: File) => Promise<void>;
  loading?: boolean;
  resolveAssetUrl?: (path: string | null | undefined) => string;
  layerMode?: LayerViewMode;
  onLayerModeChange?: (mode: LayerViewMode) => void;
}

export const ComparisonWorkspace: React.FC<ComparisonWorkspaceProps> = (props) => {
  const { job, layerMode: externalLayerMode, onLayerModeChange } = props;
  const context = useJob();
  const resolveUrl = props.resolveAssetUrl || context.resolveAssetUrl;
  const getVegetationAnalysis = context.getVegetationAnalysis;

  const [internalMode, setInternalMode] = useState<LayerViewMode>('natural_color');
  const [vegStats, setVegStats] = useState<VegetationAnalysisResponse | null>(null);
  const [vegLoading, setVegLoading] = useState(false);

  const currentMode = externalLayerMode || internalMode;
  const setMode = (mode: LayerViewMode) => {
    if (onLayerModeChange) {
      onLayerModeChange(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const isCompleted = Boolean(job && (job.status === 'completed' || job.status === 'cached'));

  // Determine left and right preview URLs based on active Layer Mode
  let leftUrl = '';
  let rightUrl = '';
  let modeLabel = 'Natural Color · RGB (B04, B03, B02)';

  if (job?.previews) {
    if (currentMode === 'vegetation') {
      leftUrl = job.previews.lr_ndvi_url ? resolveUrl(job.previews.lr_ndvi_url) : '';
      rightUrl = job.previews.sr_ndvi_url ? resolveUrl(job.previews.sr_ndvi_url) : '';
      modeLabel = 'Vegetation · NDVI (B08/B04)';
    } else if (currentMode === 'infrared') {
      leftUrl = job.previews.lr_fc_url ? resolveUrl(job.previews.lr_fc_url) : '';
      rightUrl = job.previews.sr_fc_url ? resolveUrl(job.previews.sr_fc_url) : '';
      modeLabel = 'False Color · NIR/Red/Green (B08, B04, B03)';
    } else {
      leftUrl = job.previews.lr_rgb_url ? resolveUrl(job.previews.lr_rgb_url) : '';
      rightUrl = job.previews.sr_rgb_url ? resolveUrl(job.previews.sr_rgb_url) : '';
      modeLabel = 'Natural Color · RGB (B04, B03, B02)';
    }
  }

  // Fetch vegetation statistics when entering vegetation mode
  useEffect(() => {
    if (currentMode === 'vegetation' && job && isCompleted && getVegetationAnalysis) {
      setVegLoading(true);
      getVegetationAnalysis(job.job_id)
        .then((data) => {
          setVegStats(data);
          setVegLoading(false);
        })
        .catch(() => {
          setVegStats(null);
          setVegLoading(false);
        });
    }
  }, [currentMode, job, isCompleted, getVegetationAnalysis]);

  if (!job) {
    return (
      <div className="p-8 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF0E3] flex items-center justify-center mx-auto text-[#00613E]">
          <Upload className="w-6 h-6" />
        </div>
        <h2 className="font-display text-base font-bold text-[#0D241A]">
          No Imagery Selected
        </h2>
        <p className="text-xs text-[#6D756F]">
          Upload a 4-band 128×128 Sentinel-2 GeoTIFF or select a sample above to view comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace Header & Layer Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FCFBF7] p-3.5 rounded-2xl border border-[#D9DDD2] shadow-2xs">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#00613E]" />
          <div>
            <h2 className="text-sm font-bold font-display text-[#0D241A]">
              Spectral Layer View
            </h2>
            <p className="text-[11px] text-[#6D756F]">
              {modeLabel}
            </p>
          </div>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center bg-[#EAF0E3] p-1 rounded-xl border border-[#D9DDD2]/60 text-xs">
          <button
            type="button"
            onClick={() => setMode('natural_color')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              currentMode === 'natural_color'
                ? 'bg-[#00613E] text-white shadow-2xs'
                : 'text-[#003F2D] hover:bg-white/50'
            }`}
          >
            Natural Color
          </button>
          <button
            type="button"
            onClick={() => setMode('vegetation')}
            disabled={!isCompleted}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              currentMode === 'vegetation'
                ? 'bg-[#00613E] text-white shadow-2xs'
                : 'text-[#003F2D] hover:bg-white/50'
            }`}
          >
            Vegetation (NDVI)
          </button>
          <button
            type="button"
            onClick={() => setMode('infrared')}
            disabled={!isCompleted}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              currentMode === 'infrared'
                ? 'bg-[#00613E] text-white shadow-2xs'
                : 'text-[#003F2D] hover:bg-white/50'
            }`}
          >
            False Color (NIR)
          </button>
        </div>
      </div>

      {/* Main Interactive Comparison View */}
      <ComparisonSlider
        leftImageUrl={leftUrl}
        rightImageUrl={rightUrl}
        leftLabel="10m Sentinel-2 Input"
        rightLabel="2.5m Project Pheonix Enhanced"
      />

      {/* Vegetation Analytics Bar when in Vegetation Mode */}
      {currentMode === 'vegetation' && (
        <div className="p-4 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout className="w-4 h-4 text-[#00613E]" />
              <h3 className="text-xs font-bold text-[#0D241A] uppercase tracking-wider">
                Vegetation Index Diagnostics
              </h3>
            </div>
            <span className="text-[10px] text-[#6D756F]">Formula: (B08 - B04) / (B08 + B04)</span>
          </div>

          {vegLoading ? (
            <div className="text-xs text-[#6D756F] animate-pulse">Calculating analytical NDVI...</div>
          ) : vegStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]/80">
                <span className="text-[#6D756F] text-[11px] block">Mean NDVI</span>
                <strong className="text-[#0D241A] font-mono text-sm">{vegStats.mean_ndvi.toFixed(3)}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]/80">
                <span className="text-[#6D756F] text-[11px] block">NDVI Range</span>
                <strong className="text-[#0D241A] font-mono text-sm">
                  {vegStats.min_ndvi.toFixed(2)} to {vegStats.max_ndvi.toFixed(2)}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]/80">
                <span className="text-[#6D756F] text-[11px] block">Vegetation Cover (&gt;0.3)</span>
                <strong className="text-[#00613E] font-mono text-sm">
                  {(vegStats.vegetation_fraction * 100).toFixed(1)}%
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2]/80">
                <span className="text-[#6D756F] text-[11px] block">Valid 2.5m Pixels</span>
                <strong className="text-[#0D241A] font-mono text-sm">
                  {vegStats.valid_pixel_count.toLocaleString()}
                </strong>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Analysis unavailable until the active job is completed.</p>
          )}

          {/* Colormap Legend */}
          <div className="pt-2 border-t border-[#D9DDD2]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6D756F]">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[#0D241A]">Legend:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-[#4A648C]" />
                <span>Water/Bare (&lt;0.1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-[#D4CA32]" />
                <span>Sparse/Soil (0.1–0.3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-xs bg-[#1E7E34]" />
                <span>Dense Veg (&gt;0.4)</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 italic">Spectral screening; not ground-truth classification.</span>
          </div>
        </div>
      )}
    </div>
  );
};
