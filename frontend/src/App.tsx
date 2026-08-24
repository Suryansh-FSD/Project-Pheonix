import React, { useState, useEffect, useCallback } from 'react';
import {
  Satellite,
  Upload,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Download,
  RotateCcw,
  FileCheck,
} from 'lucide-react';
import { Stepper, type StepId } from './components/Stepper';
import { ComparisonSlider } from './components/ComparisonSlider';
import { QualityPanel } from './components/QualityPanel';
import type { JobDetailResponse, HealthResponse } from './types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const resolveAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
};

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepId>('select');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [activeJob, setActiveJob] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch health on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health check failed', err));
  }, []);

  // Poll active job status
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cached') {
      return;
    }

    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/jobs/${activeJob.job_id}`)
        .then((res) => res.json())
        .then((data: JobDetailResponse) => {
          setActiveJob(data);
          if (data.status === 'completed' || data.status === 'cached') {
            setCurrentStep('analyze');
          } else if (data.status === 'failed') {
            setErrorMsg(data.error?.message || 'Enhancement job failed.');
          }
        })
        .catch((err) => console.error('Poll failed', err));
    }, 500);

    return () => clearInterval(interval);
  }, [activeJob]);

  const handleStartEnhance = useCallback(async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a 4-band 128x128 GeoTIFF file.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('execution_mode', 'live');
    formData.append('band_order', 'B04,B03,B02,B08');
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/api/enhance`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.detail?.message || 'Failed to submit enhancement job');
      }

      const createRes = await res.json();
      setCurrentStep('enhance');

      // Fetch initial job state
      const jobRes = await fetch(`${API_BASE}/api/jobs/${createRes.job_id}`);
      const jobData = await jobRes.json();
      setActiveJob(jobData);

      if (jobData.status === 'completed' || jobData.status === 'cached') {
        setCurrentStep('analyze');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while creating enhancement job.');
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const canAccessAnalyze = Boolean(
    activeJob && (activeJob.status === 'completed' || activeJob.status === 'cached')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 antialiased selection:bg-emerald-500 selection:text-slate-950">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800/80 pb-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm">
              <Satellite className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                GeoSR <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">MVP 4×</span>
              </h1>
              <p className="text-xs text-slate-400">Sentinel-2 4-Band Super-Resolution (10m → 2.5m Ground Resolution)</p>
            </div>
          </div>

          {health && (
            <div className="flex items-center gap-2 text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${health.backend_ready ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300">Backend Ready</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Model: {health.model_ready ? 'Online' : 'Unloaded'}</span>
            </div>
          )}
        </header>

        {/* Workflow Stepper */}
        <Stepper
          currentStep={currentStep}
          canAccessAnalyze={canAccessAnalyze}
          onStepClick={(s) => setCurrentStep(s)}
        />

        {/* Error Alert Banner */}
        {errorMsg && activeJob?.status !== 'failed' && (
          <div role="alert" className="w-full p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Required</p>
              <p className="text-xs text-rose-200/90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Select / Upload */}
        {currentStep === 'select' && (
          <section className="space-y-6 text-left max-w-2xl mx-auto">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Upload Sentinel-2 GeoTIFF</h2>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-4 transition-colors ${
                  selectedFile ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                <div className="p-3.5 rounded-full bg-slate-800 text-slate-400">
                  {selectedFile ? <FileCheck className="w-7 h-7 text-emerald-400" /> : <Upload className="w-7 h-7" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">
                    {selectedFile ? selectedFile.name : 'Select or drop 4-band GeoTIFF'}
                  </p>
                  <p className="text-xs text-slate-400">
                    Must be exactly 128×128 pixels (B04, B03, B02, B08) in a projected CRS at 10m ground resolution.
                  </p>
                </div>
                <input
                  type="file"
                  accept=".tif,.tiff"
                  aria-label="Upload 4-band GeoTIFF"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                />
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleStartEnhance}
                    disabled={loading}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Run Live 4× Super-Resolution
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: Enhance Progress OR Explicit Failed State */}
        {currentStep === 'enhance' && activeJob && (
          <>
            {activeJob.status === 'failed' ? (
              <section className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-xl">
                <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-8 h-8 text-rose-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Inference Execution Failed</h3>
                  <p className="text-sm text-rose-300 font-medium">{activeJob.error?.message || 'Processing encountered an error.'}</p>
                  {activeJob.error?.suggested_action && (
                    <p className="text-xs text-slate-400">{activeJob.error.suggested_action}</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartEnhance}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Enhancement
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('select')}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Choose Another File
                  </button>
                </div>
              </section>
            ) : (
              <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center space-y-6 max-w-xl mx-auto shadow-xl">
                <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Super-Resolution Processing</h3>
                  <p className="text-xs text-slate-400 font-mono">{activeJob.current_stage || 'Executing pipeline'}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${activeJob.progress_percent}%` }}
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Executing ESA SEN2SRLite NonReference_RGBN_x4 inference on 4-band reflectance.
                </p>
              </section>
            )}
          </>
        )}

        {/* STEP 3 & 4: Analyze & Export */}
        {(currentStep === 'analyze' || currentStep === 'export') && activeJob && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Before & After Super-Resolution</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('select')}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  New Enhancement
                </button>
                {activeJob.downloads?.geotiff_url && (
                  <a
                    href={resolveAssetUrl(activeJob.downloads.geotiff_url)}
                    download
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download 2.5m GeoTIFF
                  </a>
                )}
              </div>
            </div>

            {/* Split Comparison Slider */}
            <ComparisonSlider
              leftImageUrl={resolveAssetUrl(activeJob.previews?.lr_rgb_url)}
              rightImageUrl={resolveAssetUrl(activeJob.previews?.sr_rgb_url)}
              leftLabel="Original (10m LR)"
              rightLabel="Super-Resolved (2.5m SR)"
            />

            {/* Quality & Trust Panel */}
            <QualityPanel job={activeJob} />
          </section>
        )}
      </div>
    </div>
  );
};

export default App;
