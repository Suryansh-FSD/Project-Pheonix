import React, { useState } from 'react';
import { Settings, RefreshCw, CheckCircle2, AlertTriangle, Trash2, Globe, Server } from 'lucide-react';
import { useJob, API_BASE } from '../context/JobContext';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'missing_url';

export const SettingsPage: React.FC = () => {
  const { health, refreshHealth, clearJobHistory, recentJobIds, isProdMissingApiBase } = useJob();
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (isProdMissingApiBase) {
      setConnectionState('missing_url');
      setErrorMessage('API URL missing: VITE_API_BASE_URL is not set in this production build.');
      return;
    }

    setConnectionState('connecting');
    setErrorMessage(null);

    try {
      await refreshHealth();
      setConnectionState('connected');
    } catch (err: any) {
      setConnectionState('failed');
      setErrorMessage(err.message || 'Request failed');
    }
  };

  const isConnected = Boolean(health && health.backend_ready);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0D241A] flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-[#00613E]" />
          Settings & Backend Configuration
        </h1>
        <p className="text-xs sm:text-sm text-[#6D756F] pt-0.5">
          Inspect backend connectivity, environment configuration, and local storage state.
        </p>
      </div>

      {/* Production Warning if VITE_API_BASE_URL is missing */}
      {isProdMissingApiBase && (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Missing Production API Configuration</p>
            <p className="text-amber-800">
              <code>VITE_API_BASE_URL</code> is not defined in this Vercel deployment. Requests will fail unless configured in Vercel project environment variables.
            </p>
          </div>
        </div>
      )}

      {/* Backend Connection */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00613E]" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            API Endpoint Configuration
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-[#EAF0E3]/60 border border-[#D9DDD2] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[#6D756F] block">Configured API Base URL:</span>
              <strong className="font-mono text-[#003F2D] text-xs">
                {API_BASE || '(Local Development Proxy: /api)'}
              </strong>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={connectionState === 'connecting'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${connectionState === 'connecting' ? 'animate-spin' : ''}`} />
              {connectionState === 'connecting' ? 'Connecting...' : 'Test Connection'}
            </button>
          </div>

          {connectionState === 'connected' && (
            <p className="text-xs font-semibold text-[#16744A] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Connected: Successfully reached GeoSR backend API.
            </p>
          )}

          {connectionState === 'failed' && (
            <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Request failed: {errorMessage}
            </p>
          )}

          {connectionState === 'missing_url' && (
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              API URL missing: VITE_API_BASE_URL is not set.
            </p>
          )}
        </div>
      </section>

      {/* Service Info */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-[#00613E]" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Service Information
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2]">
            <span className="text-[#6D756F] block">Backend Status:</span>
            <strong className="text-sm text-[#0D241A]">
              {isConnected ? 'Operational' : 'Unavailable — backend not connected'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2]">
            <span className="text-[#6D756F] block">API Version:</span>
            <strong className="text-sm font-mono text-[#0D241A]">
              {isConnected && health?.version ? health.version : 'Unavailable — backend not connected'}
            </strong>
          </div>
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2]">
            <span className="text-[#6D756F] block">Device:</span>
            <strong className="text-sm font-mono text-[#0D241A] uppercase">
              {isConnected && health?.device ? health.device : 'Unavailable — backend not connected'}
            </strong>
          </div>
        </div>
      </section>

      {/* Local Storage History */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            Browser Session Storage
          </h2>
        </div>

        <p className="text-xs text-[#6D756F]">
          Currently tracking {recentJobIds.length} recent job reference(s) in your local browser storage. Clearing history removes local references but leaves backend memory intact.
        </p>

        <button
          type="button"
          onClick={clearJobHistory}
          disabled={recentJobIds.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Local Job History
        </button>
      </section>
    </div>
  );
};
