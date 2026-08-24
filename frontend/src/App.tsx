import React, { useState, useEffect, useCallback } from 'react';
import {
  Satellite,
  Upload,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Stepper, type StepId } from './components/Stepper';
import { ComparisonSlider } from './components/ComparisonSlider';
import { QualityPanel } from './components/QualityPanel';
import { SampleCard } from './components/SampleCard';
import type { SampleSummary, JobDetailResponse, HealthResponse } from './types/api';

export const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepId>('select');
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleSummary | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [activeJob, setActiveJob] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch health and samples on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error('Health check failed', err));

    fetch('/api/samples')
      .then((res) => res.json())
      .then((data) => {
        setSamples(data);
        if (data.length > 0) setSelectedSample(data[0]);
      })
      .catch((err) => console.error('Samples fetch failed', err));
  }, []);

  // Poll active job status
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cached') {
      return;
    }

    const interval = setInterval(() => {
      fetch(`/api/jobs/${activeJob.job_id}`)
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

  const handleStartEnhance = useCallback(
    async (mode: 'live' | 'cached', sampleToRun?: SampleSummary) => {
      setLoading(true);
      setErrorMsg(null);
      const targetSample = sampleToRun || selectedSample;

      const formData = new FormData();
      formData.append('execution_mode', mode);
      formData.append('band_order', 'B04,B03,B02,B08');

      if (mode === 'cached') {
        if (!targetSample) {
          setErrorMsg('Please select a sample for cached baseline mode.');
          setLoading(false);
          return;
        }
        formData.append('sample_id', targetSample.sample_id);
      } else {
        if (selectedFile) {
          formData.append('file', selectedFile);
        } else if (targetSample) {
          formData.append('sample_id', targetSample.sample_id);
        } else {
          setErrorMsg('Please select a sample or upload a 128x128 GeoTIFF.');
          setLoading(false);
          return;
        }
      }

      try {
        const res = await fetch('/api/enhance', {
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
        const jobRes = await fetch(`/api/jobs/${createRes.job_id}`);
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
    },
    [selectedSample, selectedFile]
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
        <Stepper currentStep={currentStep} onStepClick={(s) => setCurrentStep(s)} />

        {/* Error Alert */}
        {errorMsg && (
          <div role="alert" className="w-full p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Action Required</p>
              <p className="text-xs text-rose-200/90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Select */}
        {currentStep === 'select' && (
          <section className="space-y-6 text-left">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sample Selection */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Option A: Bundled Verified Samples</h2>
                <div className="grid grid-cols-1 gap-3">
                  {samples.map((sample) => (
                    <SampleCard
                      key={sample.sample_id}
                      sample={sample}
                      isSelected={selectedSample?.sample_id === sample.sample_id && !selectedFile}
                      onSelect={(s) => {
                        setSelectedSample(s);
                        setSelectedFile(null);
                      }}
                      onRunCached={(s) => handleStartEnhance('cached', s)}
                      onRunLive={(s) => handleStartEnhance('live', s)}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              {/* GeoTIFF Upload */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Option B: Upload Sentinel-2 GeoTIFF</h2>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center justify-center space-y-3 transition-colors ${
                    selectedFile ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">
                      {selectedFile ? selectedFile.name : 'Select or drop 4-band GeoTIFF'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Must be exactly 128×128 pixels (B04, B03, B02, B08) at 10m resolution.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setSelectedSample(null);
                      }
                    }}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                  />
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => handleStartEnhance('live')}
                      disabled={loading}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      Run Live 4× Enhancement
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2: Enhance Progress */}
        {currentStep === 'enhance' && activeJob && (
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
                    href={activeJob.downloads.geotiff_url}
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
              leftImageUrl={activeJob.previews?.lr_rgb_url || ''}
              rightImageUrl={activeJob.previews?.sr_rgb_url || ''}
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
