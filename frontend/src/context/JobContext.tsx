import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { JobDetailResponse, HealthResponse } from '../types/api';

export type AppRoute =
  | 'home'
  | 'enhance'
  | 'compare'
  | 'analyze'
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
  setRoute: (route: AppRoute) => void;
  setSelectedFile: (file: File | null) => void;
  startEnhance: (fileOverride?: File) => Promise<void>;
  clearJobHistory: () => void;
  refreshHealth: () => Promise<void>;
  resolveAssetUrl: (path: string | null | undefined) => string;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const resolveAssetUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
};

const STORAGE_LAST_JOB_KEY = 'geosr_last_job_id';
const STORAGE_JOB_HISTORY_KEY = 'geosr_job_history_ids';

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRouteState] = useState<AppRoute>('home');
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
  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Health check failed', err);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  // Restore last job on mount
  useEffect(() => {
    const lastId = localStorage.getItem(STORAGE_LAST_JOB_KEY);
    if (lastId && !activeJob) {
      fetch(`${API_BASE}/api/jobs/${lastId}`)
        .then((res) => {
          if (res.ok) return res.json();
          if (res.status === 404) {
            // Stale job removed from server
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
  }, []);

  // Fetch recent jobs details
  useEffect(() => {
    if (recentJobIds.length === 0) {
      setRecentJobs([]);
      return;
    }

    Promise.all(
      recentJobIds.map((id) =>
        fetch(`${API_BASE}/api/jobs/${id}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const validJobs = results.filter((j): j is JobDetailResponse => j !== null);
      setRecentJobs(validJobs);
    });
  }, [recentJobIds, activeJob]);

  // Unified Polling Loop
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cached') {
      return;
    }

    const interval = setInterval(() => {
      fetch(`${API_BASE}/api/jobs/${activeJob.job_id}`)
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
            refreshHealth();
          } else if (data.status === 'failed') {
            setErrorMsg(data.error?.message || 'Inference execution failed.');
          }
        })
        .catch(() => {});
    }, 600);

    return () => clearInterval(interval);
  }, [activeJob, refreshHealth]);

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
        const res = await fetch(`${API_BASE}/api/enhance`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData?.detail?.message || 'Failed to submit enhancement job.');
        }

        const createRes = await res.json();
        const newJobId = createRes.job_id;

        // Persist to localStorage
        localStorage.setItem(STORAGE_LAST_JOB_KEY, newJobId);
        setRecentJobIds((prev) => {
          const updated = [newJobId, ...prev.filter((id) => id !== newJobId)].slice(0, 10);
          localStorage.setItem(STORAGE_JOB_HISTORY_KEY, JSON.stringify(updated));
          return updated;
        });

        // Initial fetch
        const jobRes = await fetch(`${API_BASE}/api/jobs/${newJobId}`);
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
    [selectedFile]
  );

  const clearJobHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_LAST_JOB_KEY);
    localStorage.removeItem(STORAGE_JOB_HISTORY_KEY);
    setRecentJobIds([]);
    setRecentJobs([]);
    setActiveJob(null);
  }, []);

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
        setRoute,
        setSelectedFile,
        startEnhance,
        clearJobHistory,
        refreshHealth,
        resolveAssetUrl,
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
