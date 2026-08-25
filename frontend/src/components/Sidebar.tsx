import React from 'react';
import {
  Home,
  Sparkles,
  Columns,
  BarChart3,
  GitCompare,
  ShieldCheck,
  Download,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { useJob, type AppRoute } from '../context/JobContext';

interface SidebarItem {
  id: AppRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
}

export const Sidebar: React.FC = () => {
  const { currentRoute, setRoute } = useJob();

  const navItems: SidebarItem[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'enhance', label: 'Enhance Image', icon: Sparkles },
    { id: 'compare', label: 'Compare Results', icon: Columns },
    { id: 'analyze', label: 'Analyze Land', icon: BarChart3 },
    { id: 'changes', label: 'Detect Changes', icon: GitCompare },
    { id: 'quality', label: 'Quality Check', icon: ShieldCheck },
    { id: 'downloads', label: 'Downloads', icon: Download },
  ];

  const bottomItems: SidebarItem[] = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: HelpCircle },
  ];

  return (
    <aside
      className="relative flex flex-col w-64 shrink-0 bg-[#003F2D] text-[#EAF0E3] select-none shadow-md overflow-hidden"
      aria-label="Sidebar Navigation"
    >
      {/* Topographic Contour Texture Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen"
        style={{
          backgroundImage: `
            repeating-radial-gradient(circle at 15% 20%, transparent 0, transparent 18px, rgba(255,255,255,0.7) 19px, transparent 20px),
            repeating-radial-gradient(circle at 85% 75%, transparent 0, transparent 28px, rgba(255,255,255,0.6) 29px, transparent 30px),
            repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(255,255,255,0.5) 41px, transparent 42px)
          `,
          backgroundSize: '120px 120px, 180px 180px, 240px 240px',
        }}
      />

      {/* Brand Header — Seamless Phoenix Emblem & Typography */}
      <div className="relative z-10 px-4 pt-5 pb-4 border-b border-[#004F33]/60 flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center mb-1.5">
          {/* Subtle warm radiant ambient glow */}
          <div className="absolute w-20 h-20 bg-gradient-to-tr from-amber-500/25 via-orange-500/20 to-transparent rounded-full blur-xl pointer-events-none" />
          <img
            src="/project-phoenix-logo.png"
            alt="Project Phoenix logo"
            className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_4px_12px_rgba(234,88,12,0.35)] transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="space-y-0.5">
          <div className="font-display font-extrabold text-lg tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="bg-gradient-to-r from-amber-200 via-orange-200 to-white bg-clip-text text-transparent">
              Project Phoenix
            </span>
          </div>
          <p className="text-[11px] text-[#A5C4B4] font-medium tracking-wide">
            Satellite Super-Resolution
          </p>
          <div className="pt-1">
            <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-md bg-[#16744A]/80 text-emerald-100 border border-emerald-400/30">
              2.5m Resolution
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Items */}
      <nav className="relative z-10 flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#7BA693]">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && setRoute(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-[#7BA693]'
                  : isActive
                  ? 'bg-[#16744A] text-white shadow-2xs font-semibold'
                  : 'text-[#EAF0E3] hover:bg-[#004F33]/80 hover:text-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-emerald-200' : 'text-[#A5C4B4]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="shrink-0 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-white/10 text-emerald-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="relative z-10 p-3 border-t border-[#004F33]/60 space-y-1 bg-[#003626]">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setRoute(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[#16744A] text-white shadow-2xs font-semibold'
                  : 'text-[#A5C4B4] hover:bg-[#004F33] hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-200' : 'text-[#7BA693]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
