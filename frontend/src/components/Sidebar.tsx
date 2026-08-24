import React, { useState } from 'react';
import {
  Home,
  Sparkles,
  Columns,
  BarChart3,
  RefreshCw,
  ShieldCheck,
  Download,
  Settings,
  HelpCircle,
  Menu,
  X,
  Satellite,
} from 'lucide-react';
import { useJob, type AppRoute } from '../context/JobContext';

export const Sidebar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { currentRoute, setRoute } = useJob();

  const navItems: { id: AppRoute | 'changes'; label: string; icon: any; disabled?: boolean }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'enhance', label: 'Enhance Image', icon: Sparkles },
    { id: 'compare', label: 'Compare Results', icon: Columns },
    { id: 'analyze', label: 'Analyze Land', icon: BarChart3 },
    { id: 'changes', label: 'Detect Changes', icon: RefreshCw, disabled: true },
    { id: 'quality', label: 'Quality Check', icon: ShieldCheck },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ];

  const bottomItems: { id: AppRoute; label: string; icon: any }[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#003F2D] text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-[#EAF0E3]"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-60 bg-[#003F2D] bg-topo-pattern text-slate-100 flex flex-col justify-between p-4 shadow-xl transition-transform duration-300 ease-in-out shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo Brand */}
          <button
            type="button"
            onClick={() => {
              setRoute('home');
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 px-2 pt-2 text-left cursor-pointer w-full focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-[#EAF0E3] flex items-center justify-center text-[#003F2D] shadow-sm">
              <Satellite className="w-5 h-5 rotate-45" />
            </div>
            <span className="font-display text-2xl tracking-tight font-bold text-[#FCFBF7]">
              GeoSR
            </span>
          </button>

          {/* Navigation Items */}
          <nav aria-label="Main Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;

              if (item.disabled) {
                return (
                  <div key={item.id} className="relative group">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300/80 hover:text-white text-sm font-normal transition-colors cursor-not-allowed opacity-60"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{item.label}</span>
                    </button>
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:inline-block px-2.5 py-1 bg-slate-900 text-[11px] text-slate-200 rounded shadow-lg whitespace-nowrap z-50">
                      Coming soon — backend capability unavailable
                    </span>
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setRoute(item.id as AppRoute);
                    setMobileOpen(false);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer text-left ${
                    isActive
                      ? 'bg-[#EAF0E3] text-[#003F2D] shadow-xs font-semibold'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#003F2D]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom items */}
        <div className="space-y-1 pt-4 border-t border-white/10">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setRoute(item.id);
                  setMobileOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-[#EAF0E3] text-[#003F2D] font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
