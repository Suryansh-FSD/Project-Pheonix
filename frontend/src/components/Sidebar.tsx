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

interface SidebarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, disabled: true },
    { id: 'enhance', label: 'Enhance Image', icon: Sparkles, active: true },
    { id: 'compare', label: 'Compare Results', icon: Columns, disabled: true },
    { id: 'analyze', label: 'Analyze Land', icon: BarChart3, disabled: true },
    { id: 'changes', label: 'Detect Changes', icon: RefreshCw, disabled: true },
    { id: 'quality', label: 'Quality Check', icon: ShieldCheck, disabled: true },
    { id: 'downloads', label: 'Downloads', icon: Download, disabled: true },
  ];

  const bottomItems = [
    { id: 'settings', label: 'Settings', icon: Settings, disabled: true },
    { id: 'help', label: 'Help', icon: HelpCircle, disabled: true },
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
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="w-9 h-9 rounded-full bg-[#EAF0E3] flex items-center justify-center text-[#003F2D] shadow-sm">
              <Satellite className="w-5 h-5 rotate-45" />
            </div>
            <span className="font-display text-2xl tracking-tight font-bold text-[#FCFBF7]">
              GeoSR
            </span>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Main Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.active) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current="page"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#EAF0E3] text-[#003F2D] font-medium text-sm shadow-xs transition-colors cursor-default"
                  >
                    <Icon className="w-4 h-4 text-[#003F2D]" />
                    <span>{item.label}</span>
                  </button>
                );
              }

              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300/80 hover:text-white text-sm font-normal transition-colors cursor-not-allowed opacity-75"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                  <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:inline-block px-2 py-1 bg-slate-900 text-[11px] text-slate-200 rounded shadow-lg whitespace-nowrap z-50">
                    Coming soon
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom items */}
        <div className="space-y-1 pt-4 border-t border-white/10">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 text-xs transition-colors cursor-not-allowed"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </button>
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:inline-block px-2 py-1 bg-slate-900 text-[11px] text-slate-200 rounded shadow-lg whitespace-nowrap z-50">
                  Coming soon
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
