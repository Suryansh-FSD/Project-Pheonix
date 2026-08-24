import React, { useState } from 'react';
import { Settings, RefreshCw, CheckCircle2, Trash2, Globe, Server } from 'lucide-react';
import { useJob, API_BASE } from '../context/JobContext';

export const SettingsPage: React.FC = () => {
  const { health, refreshHealth, clearJobHistory, recentJobIds } = useJob();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await refreshHealth();
      setTestResult('Successfully connected to GeoSR backend!');
    } catch (err: any) {
      setTestResult(`Connection test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

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

      {/* Backend Connection */}
      <section className="p-6 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#00613E]" />
          <h2 className="font-display text-base font-bold text-[#0D241A]">
            API Endpoint Configuration
          </h2>
        </div>

        <div className="space-y-2 text-xs">
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
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#00613E] hover:bg-[#004F33] text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          {testResult && (
            <p className="text-xs font-semibold text-[#16744A] flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-4 h-4" />
              {testResult}
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
            <strong className="text-sm text-[#0D241A]">{health?.backend_ready ? 'Operational' : 'Offline'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2]">
            <span className="text-[#6D756F] block">API Version:</span>
            <strong className="text-sm font-mono text-[#0D241A]">{health?.version || '1.0.0'}</strong>
          </div>
          <div className="p-3 rounded-xl bg-[#EAF0E3]/40 border border-[#D9DDD2]">
            <span className="text-[#6D756F] block">Device:</span>
            <strong className="text-sm font-mono text-[#0D241A] uppercase">{health?.device || 'cpu'}</strong>
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
