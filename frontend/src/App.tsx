import { useEffect, useState } from 'react'
import type { HealthResponse } from '@/types/api'
import { Activity, Satellite, CheckCircle2, XCircle } from 'lucide-react'

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.json()
      })
      .then((data: HealthResponse) => {
        setHealth(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Satellite className="w-8 h-8 text-[#087A55]" />
          <div>
            <h1 className="text-2xl font-bold text-[#052E24]">GeoSR Super-Resolution Workspace</h1>
            <p className="text-sm text-[#67736D]">Sentinel-2 10 m to 2.5 m (SEN2SRLite baseline)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border bg-white shadow-xs">
          <Activity className="w-4 h-4 text-[#087A55]" />
          <span>Wave 0 Foundation Active</span>
        </div>
      </header>

      <section className="p-6 bg-white rounded-xl border shadow-xs flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-[#052E24]">System Health & Contract Status</h2>
        {loading && <p className="text-sm text-[#67736D]">Probing /api/health endpoint...</p>}
        {error && (
          <div className="flex items-center gap-2 text-sm text-[#D84E4E] bg-red-50 p-3 rounded-lg border border-red-200">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>Backend unreachable ({error}). Local service required on port 8000.</span>
          </div>
        )}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-[#F4F7F1] rounded-lg">
              <span className="text-[#67736D] block text-xs">Backend Readiness</span>
              <span className="font-semibold text-[#052E24] flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-[#087A55]" /> Ready (v{health.version})
              </span>
            </div>
            <div className="p-3 bg-[#F4F7F1] rounded-lg">
              <span className="text-[#67736D] block text-xs">Model Status</span>
              <span className="font-semibold text-[#052E24] block mt-1">
                {health.model_ready ? 'Loaded' : 'Pending Wave 1'}
              </span>
            </div>
            <div className="p-3 bg-[#F4F7F1] rounded-lg">
              <span className="text-[#67736D] block text-xs">Model Identifier</span>
              <span className="font-semibold text-[#052E24] block mt-1">
                {health.model_provenance.model_name} ({health.model_provenance.model_variant})
              </span>
            </div>
            <div className="p-3 bg-[#F4F7F1] rounded-lg">
              <span className="text-[#67736D] block text-xs">Inference Device</span>
              <span className="font-semibold text-[#052E24] block mt-1 uppercase">
                {health.device}
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
