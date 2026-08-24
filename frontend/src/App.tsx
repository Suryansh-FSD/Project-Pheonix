import React from 'react';
import { JobProvider, useJob } from './context/JobContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomActionBar } from './components/BottomActionBar';

import { HomePage } from './pages/HomePage';
import { EnhancePage } from './pages/EnhancePage';
import { ComparePage } from './pages/ComparePage';
import { AnalyzePage } from './pages/AnalyzePage';
import { DetectChangesPage } from './pages/DetectChangesPage';
import { QualityPage } from './pages/QualityPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';

export { resolveAssetUrl } from './context/JobContext';

const MainRouter: React.FC = () => {
  const { currentRoute, activeJob, health, resolveAssetUrl } = useJob();

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case 'home':
        return <HomePage />;
      case 'enhance':
        return <EnhancePage />;
      case 'compare':
        return <ComparePage />;
      case 'analyze':
        return <AnalyzePage />;
      case 'changes':
        return <DetectChangesPage />;
      case 'quality':
        return <QualityPage />;
      case 'downloads':
        return <DownloadsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'help':
        return <HelpPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F1] text-[#0D241A] flex flex-col md:flex-row antialiased selection:bg-[#EAF0E3] selection:text-[#003F2D]">
      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden flex flex-col justify-between">
        <div className="space-y-5">
          {/* Top Utility Bar */}
          <TopBar />

          {/* Active Page View */}
          {renderCurrentPage()}
        </div>

        {/* Bottom Sticky Action Bar */}
        <BottomActionBar
          job={activeJob}
          backendReady={Boolean(health?.backend_ready)}
          resolveAssetUrl={resolveAssetUrl}
        />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <JobProvider>
      <MainRouter />
    </JobProvider>
  );
};

export default App;
