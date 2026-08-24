import React, { useRef } from 'react';
import { Sparkles, Upload, AlertTriangle } from 'lucide-react';
import { useJob } from '../context/JobContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { MetricCards } from '../components/MetricCard';
import { ComparisonWorkspace } from '../components/ComparisonWorkspace';
import { QualityTrustPanel } from '../components/QualityTrustPanel';
import { LowerCards } from '../components/LowerCards';

export const EnhancePage: React.FC = () => {
  const {
    health,
    activeJob,
    selectedFile,
    setSelectedFile,
    startEnhance,
    loading,
    errorMsg,
    setRoute,
    resolveAssetUrl,
  } = useJob();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStepId = () => {
    if (!activeJob) return selectedFile ? 'select' : 'select';
    if (activeJob.status === 'running' || activeJob.status === 'queued') return 'enhance';
    if (activeJob.status === 'completed' || activeJob.status === 'cached') return 'analyze';
    return 'select';
  };

  const canAccessAnalyze = Boolean(
    activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached')
  );

  return (
    <div className="space-y-5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".tif,.tiff"
        aria-label="Upload GeoTIFF"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
          }
        }}
      />

      {/* Stepper */}
      <WorkflowStepper
        currentStep={getStepId()}
        canAccessAnalyze={canAccessAnalyze}
        onStepClick={(s) => {
          if (s === 'analyze' || s === 'export') {
            setRoute('compare');
          }
        }}
      />

      {/* Header Action Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A]">
            Enhance Satellite Imagery
          </h1>
          <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
            Turn 10 m Sentinel-2 imagery into clearer, analysis-ready 2.5 m maps.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (selectedFile) {
                  startEnhance();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[#EAF0E3]" />
              Enhance Image
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#FCFBF7] hover:bg-[#EAF0E3] text-[#00613E] border border-[#00613E] shadow-2xs transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload GeoTIFF
            </button>
          </div>
          <span className="text-[10px] text-[#6D756F]">Estimated time: under 30 seconds</span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="w-full p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Action Required</p>
            <p className="text-rose-700">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <MetricCards job={activeJob} backendReady={Boolean(health?.backend_ready)} />

      {/* Main Center Area: Split Comparison & Quality Trust Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

      {/* Lower Cards */}
      <LowerCards job={activeJob} />
    </div>
  );
};
