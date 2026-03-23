import { useEffect } from 'react';
import { useFeedStore } from './store/feedStore';
import { TabBar } from './components/TabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { HomeView } from './views/HomeView';
import { CategoryView } from './views/CategoryView';
import { SettingsView } from './views/SettingsView';
import { DiscoverView } from './views/DiscoverView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type { Category } from './domain/types';

const CATEGORY_TABS = new Set<string>(['chile', 'global', 'tech', 'custom']);

function ActiveView() {
  const { activeTab } = useFeedStore();

  if (activeTab === 'brief') return <HomeView />;
  if (activeTab === 'settings') return <SettingsView />;
  if (activeTab === 'discover') return <DiscoverView />;
  if (CATEGORY_TABS.has(activeTab)) return <CategoryView category={activeTab as Category} />;
  return null;
}

export default function App() {
  const { initFromDB, refresh, feeds } = useFeedStore();
  const isOnline = useOnlineStatus();

  // Restore persisted state on mount
  useEffect(() => {
    void initFromDB();
  }, [initFromDB]);

  // Auto-refresh feeds on open if online and feeds are configured
  useEffect(() => {
    if (isOnline && feeds.length > 0) {
      void refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* App header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-2.5 sticky top-0 z-10 shadow-[0_1px_0_0_#f1f5f9]">
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight">Daily Brief</h1>
        {!isOnline && (
          <span className="ml-auto text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            Offline
          </span>
        )}
      </header>

      {/* Offline banner */}
      <OfflineBanner />

      {/* Tab navigation — sticky bottom */}
      <main className="flex-1 max-w-2xl w-full mx-auto pb-16">
        <ActiveView />
      </main>

      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-10">
        <TabBar />
      </div>
    </div>
  );
}
