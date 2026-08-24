import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Upload, AlertTriangle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { WorkflowStepper, type StepId } from './components/WorkflowStepper';
import { MetricCards } from './components/MetricCard';
import { ComparisonWorkspace } from './components/ComparisonWorkspace';
import { QualityTrustPanel } from './components/QualityTrustPanel';
import { LowerCards } from './components/LowerCards';
import { BottomActionBar } from './components/BottomActionBar';
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        setErrorMsg('Please select a 4-band 128x128 GeoTIFF file.');
      }
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setCurrentStep('enhance');

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
    <div className="min-h-screen bg-[#F8F7F1] text-[#0D241A] flex flex-col md:flex-row antialiased selection:bg-[#EAF0E3] selection:text-[#003F2D]">
      {/* Hidden File Input for Header and Workspace Triggers */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".tif,.tiff"
        aria-label="Upload GeoTIFF"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setErrorMsg(null);
          }
        }}
      />

      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5 overflow-x-hidden">
        {/* Top Utility Bar */}
        <TopBar />

        {/* Workflow Stepper */}
        <WorkflowStepper
          currentStep={currentStep}
          canAccessAnalyze={canAccessAnalyze}
          onStepClick={(s) => setCurrentStep(s)}
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
                onClick={handleStartEnhance}
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

        {/* Error Alert Banner */}
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

        {/* Summary Metric Cards */}
        <MetricCards job={activeJob} backendReady={Boolean(health?.backend_ready)} />

        {/* Main Center Area: Split Comparison & Quality Trust Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ComparisonWorkspace
              job={activeJob}
              selectedFile={selectedFile}
              onFileSelect={(f) => {
                setSelectedFile(f);
                setErrorMsg(null);
              }}
              onStartEnhance={handleStartEnhance}
              loading={loading}
              resolveAssetUrl={resolveAssetUrl}
            />
          </div>
          <div className="lg:col-span-1">
            <QualityTrustPanel job={activeJob} />
          </div>
        </div>

        {/* Lower 3 Cards */}
        <LowerCards job={activeJob} />

        {/* Bottom Sticky / Anchored Action Bar */}
        <BottomActionBar
          job={activeJob}
          backendReady={Boolean(health?.backend_ready)}
          resolveAssetUrl={resolveAssetUrl}
        />
      </main>
    </div>
  );
};

export default App;
