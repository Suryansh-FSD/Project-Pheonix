import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  JobDetailResponse,
  HealthResponse,
  VegetationAnalysisResponse,
  ChangeDetectionRequest,
  ChangeDetectionResponse,
} from '../types/api';
import { buildAssetUrl } from '../utils/url';

export type AppRoute =
  | 'home'
  | 'enhance'
  | 'compare'
  | 'analyze'
  | 'changes'
  | 'quality'
  | 'downloads'
  | 'settings'
  | 'help';

interface JobContextType {
  health: HealthResponse | null;
  activeJob: JobDetailResponse | null;
  recentJobs: JobDetailResponse[];
  recentJobIds: string[];
  selectedFile: File | null;
  loading: boolean;
  errorMsg: string | null;
  currentRoute: AppRoute;
  apiBase: string;
  isProdMissingApiBase: boolean;
  setRoute: (route: AppRoute) => void;
  setSelectedFile: (file: File | null) => void;
  setApiBaseUrl: (url: string) => Promise<HealthResponse>;
  startEnhance: (fileOverride?: File) => Promise<void>;
  clearJobHistory: () => void;
  refreshHealth: () => Promise<HealthResponse>;
  resolveAssetUrl: (path: string | null | undefined) => string;
  getVegetationAnalysis: (jobId: string) => Promise<VegetationAnalysisResponse>;
  runChangeDetection: (req: ChangeDetectionRequest) => Promise<ChangeDetectionResponse>;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

const STORAGE_LAST_JOB_KEY = 'geosr_last_job_id';
const STORAGE_JOB_HISTORY_KEY = 'geosr_job_history_ids';
const STORAGE_CUSTOM_API_KEY = 'geosr_custom_api_base';

const getInitialApiBase = (): string => {
  try {
    const custom = localStorage.getItem(STORAGE_CUSTOM_API_KEY);
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {}
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) {
    return envBase;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  return 'https://suryansh-fsd--project-pheonix-backend-modalapp-fastapi-backend.modal.run';
};

export const API_BASE = getInitialApiBase();

export const resolveAssetUrl = (path: string | null | undefined): string => {
  return buildAssetUrl(path, getInitialApiBase());
};

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRouteState] = useState<AppRoute>('home');
  const [apiBase, setApiBaseState] = useState<string>(getInitialApiBase);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeJob, setActiveJob] = useState<JobDetailResponse | null>(null);
  const [recentJobIds, setRecentJobIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_JOB_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [recentJobs, setRecentJobs] = useState<JobDetailResponse[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isProdMissingApiBase = import.meta.env.PROD && !apiBase;

  // Hash-based routing synchronization
  const setRoute = useCallback((route: AppRoute) => {
    setCurrentRouteState(route);
    window.location.hash = route;
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as AppRoute;
      const validRoutes: AppRoute[] = [
        'home',
        'enhance',
        'compare',
        'analyze',
        'changes',
        'quality',
        'downloads',
        'settings',
        'help',
      ];
      if (validRoutes.includes(hash)) {
        setCurrentRouteState(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch Health
  const refreshHealth = useCallback(async (customBase?: string): Promise<HealthResponse> => {
    const targetBase = customBase !== undefined ? customBase : apiBase;
    const url = buildAssetUrl('/api/health', targetBase);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText || 'Health check failed'}`);
    }
    const data: HealthResponse = await res.json();
    setHealth(data);
    return data;
  }, [apiBase]);

  const setApiBaseUrl = useCallback(async (url: string): Promise<HealthResponse> => {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    localStorage.setItem(STORAGE_CUSTOM_API_KEY, cleanUrl);
    setApiBaseState(cleanUrl);
    return await refreshHealth(cleanUrl);
  }, [refreshHealth]);

  useEffect(() => {
    refreshHealth().catch(() => {
      setHealth(null);
    });
  }, [refreshHealth]);

  // Restore last job on mount
  useEffect(() => {
    const lastId = localStorage.getItem(STORAGE_LAST_JOB_KEY);
    if (lastId && !activeJob) {
      fetch(buildAssetUrl(`/api/jobs/${lastId}`, apiBase))
        .then((res) => {
          if (res.ok) return res.json();
          if (res.status === 404) {
            localStorage.removeItem(STORAGE_LAST_JOB_KEY);
            setRecentJobIds((prev) => {
              const filtered = prev.filter((id) => id !== lastId);
              localStorage.setItem(STORAGE_JOB_HISTORY_KEY, JSON.stringify(filtered));
              return filtered;
            });
          }
          return null;
        })
        .then((jobData: JobDetailResponse | null) => {
          if (jobData) {
            setActiveJob(jobData);
          }
        })
        .catch(() => {});
    }
  }, [apiBase]);

  // Fetch recent jobs details
  useEffect(() => {
    if (recentJobIds.length === 0) {
      setRecentJobs([]);
      return;
    }

    Promise.all(
      recentJobIds.map((id) =>
        fetch(buildAssetUrl(`/api/jobs/${id}`, apiBase))
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const validJobs = results.filter((j): j is JobDetailResponse => j !== null);
      setRecentJobs(validJobs);
    });
  }, [recentJobIds, activeJob, apiBase]);

  // Unified Polling Loop
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cached') {
      return;
    }

    const interval = setInterval(() => {
      fetch(buildAssetUrl(`/api/jobs/${activeJob.job_id}`, apiBase))
        .then((res) => {
          if (res.ok) return res.json();
          if (res.status === 404) {
            setErrorMsg('Job was expired or not found on server.');
            return null;
          }
          return null;
        })
        .then((data: JobDetailResponse | null) => {
          if (!data) return;
          setActiveJob(data);
          if (data.status === 'completed' || data.status === 'cached') {
            refreshHealth().catch(() => {});
          } else if (data.status === 'failed') {
            setErrorMsg(data.error?.message || 'Inference execution failed.');
          }
        })
        .catch(() => {});
    }, 600);

    return () => clearInterval(interval);
  }, [activeJob, refreshHealth, apiBase]);

  const startEnhance = useCallback(
    async (fileOverride?: File) => {
      const fileToUpload = fileOverride || selectedFile;
      if (!fileToUpload) {
        setErrorMsg('Please select a 4-band 128x128 GeoTIFF file.');
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('execution_mode', 'live');
      formData.append('band_order', 'B04,B03,B02,B08');
      formData.append('file', fileToUpload);

      try {
        const res = await fetch(buildAssetUrl('/api/enhance', apiBase), {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.detail?.message || 'Failed to submit enhancement job.');
        }

        const createRes = await res.json();
        const newJobId = createRes.job_id;

        localStorage.setItem(STORAGE_LAST_JOB_KEY, newJobId);
        setRecentJobIds((prev) => {
          const updated = [newJobId, ...prev.filter((id) => id !== newJobId)].slice(0, 10);
          localStorage.setItem(STORAGE_JOB_HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });

        const jobRes = await fetch(buildAssetUrl(`/api/jobs/${newJobId}`, apiBase));
        if (jobRes.ok) {
          const jobData = await jobRes.json();
          setActiveJob(jobData);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An error occurred while creating enhancement job.');
      } finally {
        setLoading(false);
      }
    },
    [selectedFile, apiBase]
  );

  const getVegetationAnalysis = useCallback(async (jobId: string): Promise<VegetationAnalysisResponse> => {
    const res = await fetch(buildAssetUrl(`/api/jobs/${jobId}/analysis/vegetation`, apiBase));
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.detail?.message || 'Failed to fetch vegetation analysis.');
    }
    return res.json();
  }, [apiBase]);

  const runChangeDetection = useCallback(async (req: ChangeDetectionRequest): Promise<ChangeDetectionResponse> => {
    const res = await fetch(buildAssetUrl('/api/change-detection', apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.detail?.message || 'Failed to compute change detection.');
    }
    return res.json();
  }, [apiBase]);

  const clearJobHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_LAST_JOB_KEY);
    localStorage.removeItem(STORAGE_JOB_HISTORY_KEY);
    setRecentJobIds([]);
    setRecentJobs([]);
    setActiveJob(null);
  }, []);

  const resolveUrl = useCallback((path: string | null | undefined): string => {
    return buildAssetUrl(path, apiBase);
  }, [apiBase]);

  return (
    <JobContext.Provider
      value={{
        health,
        activeJob,
        recentJobs,
        recentJobIds,
        selectedFile,
        loading,
        errorMsg,
        currentRoute,
        apiBase,
        isProdMissingApiBase,
        setRoute,
        setSelectedFile,
        setApiBaseUrl,
        startEnhance,
        clearJobHistory,
        refreshHealth,
        resolveAssetUrl: resolveUrl,
        getVegetationAnalysis,
        runChangeDetection,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJob = (): JobContextType => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJob must be used within a JobProvider');
  }
  return context;
};
