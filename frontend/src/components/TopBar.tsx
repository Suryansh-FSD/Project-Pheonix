import React from 'react';
import { Search, Calendar, Bell, Globe2 } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <header className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pb-4">
      {/* Search Input */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          readOnly
          aria-label="Location search"
          placeholder="Search location or coordinates"
          className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-[#FCFBF7] border border-[#D9DDD2] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00613E] shadow-2xs"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {/* Simple / Expert toggle */}
        <div className="flex items-center bg-[#EAF0E3] p-0.5 rounded-lg border border-[#D9DDD2]">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold rounded-md bg-[#FCFBF7] text-[#0D241A] shadow-2xs cursor-default"
          >
            Simple
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1 text-xs font-normal text-slate-500 cursor-not-allowed opacity-60"
          >
            Expert
          </button>
        </div>

        {/* Date range picker shell */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FCFBF7] border border-[#D9DDD2] text-xs text-slate-700 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>May 20 – May 26, 2024</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 rounded-full bg-[#FCFBF7] border border-[#D9DDD2] text-slate-600 hover:text-slate-900 shadow-2xs transition-colors"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Earth Avatar */}
        <div
          title="Global Earth View"
          className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-300 shadow-2xs overflow-hidden"
        >
          <Globe2 className="w-5 h-5 text-emerald-400" />
        </div>
      </div>
    </header>
  );
};
