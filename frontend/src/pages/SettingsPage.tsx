import React, { useState } from 'react';
import { Settings, RefreshCw, CheckCircle2, AlertTriangle, Trash2, Globe, Server, Save } from 'lucide-react';
import { useJob } from '../context/JobContext';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'failed' | 'missing_url';

export const SettingsPage: React.FC = () => {
  const { health, clearJobHistory, recentJobIds, isProdMissingApiBase, apiBase, setApiBaseUrl } = useJob();
  const [urlInput, setUrlInput] = useState<string>(apiBase);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveAndConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setConnectionState('connecting');
    setErrorMessage(null);

    try {
      await setApiBaseUrl(urlInput);
      setConnectionState('connected');
    } catch (err: any) {
      setConnectionState('failed');
      setErrorMessage(err.message || 'Request failed to reach backend endpoint.');
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
          Inspect backend connectivity, update live Cloudflare tunnel endpoints, and manage local session storage.
        </p>
      </div>

      {/* Production Warning if API base is completely empty in production */}
      {isProdMissingApiBase && (
        <div role="alert" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Backend Endpoint Not Configured</p>
            <p className="text-amber-800">
              Please paste your active Cloudflare Tunnel URL below and click <strong>Save & Test Connection</strong>.
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

        <form onSubmit={handleSaveAndConnect} className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <label className="text-[#6D756F] font-semibold block">
              Active Backend Base URL (Cloudflare Tunnel or Localhost):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-tunnel.trycloudflare.com or http://127.0.0.1:8000"
                className="flex-1 p-2.5 rounded-xl bg-white border border-[#D9DDD2] font-mono text-xs text-[#0D241A] focus:outline-none focus:ring-2 focus:ring-[#00613E]"
              />
              <button
                type="submit"
                disabled={connectionState === 'connecting'}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {connectionState === 'connecting' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {connectionState === 'connecting' ? 'Connecting...' : 'Save & Test Connection'}
              </button>
            </div>
            <p className="text-[11px] text-[#6D756F]">
              Enter the active Cloudflare Tunnel URL or leave empty for local development proxy.
            </p>
          </div>

          {connectionState === 'connected' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#16744A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16744A]" />
              <span>Connected: Successfully reached Project Pheonix backend API ({health?.model_provenance?.model_name || 'SEN2SRLite'}).</span>
            </div>
          )}

          {connectionState === 'failed' && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Connection Failed: {errorMessage}</span>
            </div>
          )}
        </form>
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
