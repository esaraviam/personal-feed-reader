import { useEffect } from 'react';
import { useFeedStore } from './store/feedStore';
import { TabBar } from './components/TabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { HomeView } from './views/HomeView';
import { CategoryView } from './views/CategoryView';
import { SettingsView } from './views/SettingsView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import type { Category } from './domain/types';

const CATEGORY_TABS = new Set<string>(['chile', 'global', 'tech', 'custom']);

function ActiveView() {
  const { activeTab } = useFeedStore();

  if (activeTab === 'brief') return <HomeView />;
  if (activeTab === 'settings') return <SettingsView />;
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* App header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">📰</span>
        <h1 className="text-base font-semibold text-gray-900 tracking-tight">Daily Brief</h1>
      </header>

      {/* Offline banner — shown only when offline */}
      <OfflineBanner />

      {/* Tab navigation */}
      <TabBar />

      {/* Main content */}
      <main className="flex-1 max-w-2xl w-full mx-auto">
        <ActiveView />
      </main>
    </div>
  );
}
