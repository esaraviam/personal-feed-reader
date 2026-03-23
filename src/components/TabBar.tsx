import { useFeedStore, type TabId } from '../store/feedStore';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'brief', label: 'Brief', icon: '⚡' },
  { id: 'chile', label: 'Chile', icon: '🇨🇱' },
  { id: 'global', label: 'Global', icon: '🌍' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'custom', label: 'Custom', icon: '📌' },
  { id: 'discover', label: 'Discover', icon: '🔍' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useFeedStore();

  return (
    <nav className="flex border-b border-gray-100 bg-white overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
