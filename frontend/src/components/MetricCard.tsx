import React from 'react';
import { LayoutGrid, Sparkles, TrendingUp, Activity, HelpCircle } from 'lucide-react';
import type { JobDetailResponse } from '../types/api';

interface MetricCardsProps {
  job: JobDetailResponse | null;
  backendReady: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ job, backendReady }) => {
  const getStatusText = () => {
    if (!backendReady) return 'Connecting...';
    if (!job) return 'Ready';
    if (job.status === 'queued') return 'Queued';
    if (job.status === 'running') return 'Processing';
    if (job.status === 'completed' || job.status === 'cached') return 'Completed';
    if (job.status === 'failed') return 'Failed';
    return 'Ready';
  };

  const cards = [
    {
      id: 'original',
      icon: LayoutGrid,
      title: 'Original Detail',
      value: '10 m',
      info: 'Sentinel-2 Level-2A Ground Sampling Distance',
    },
    {
      id: 'enhanced',
      icon: Sparkles,
      title: 'Enhanced Detail',
      value: job?.status === 'completed' || job?.status === 'cached' ? '2.5 m' : '—',
      info: 'SEN2SRLite Super-Resolved Ground Resolution',
    },
    {
      id: 'improvement',
      icon: TrendingUp,
      title: 'Improvement',
      value: '4×',
      info: 'Spatial resolution scaling factor across RGB and NIR bands',
    },
    {
      id: 'status',
      icon: Activity,
      title: 'Processing Status',
      value: getStatusText(),
      info: 'Live worker execution state',
    },
  ];

  return (
    <section aria-label="Key Metrics" className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FCFBF7] border border-[#D9DDD2] shadow-2xs transition-all hover:border-slate-300"
          >
            <div className="p-2.5 rounded-xl bg-[#EAF0E3] text-[#003F2D] shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium text-[#6D756F] truncate">{card.title}</span>
                <span title={card.info} className="text-slate-400 hover:text-slate-600 cursor-help">
                  <HelpCircle className="w-3 h-3" />
                </span>
              </div>
              <p className="text-lg font-bold text-[#0D241A] tracking-tight truncate">{card.value}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
};
