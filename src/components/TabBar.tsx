import { useFeedStore, type TabId } from '../store/feedStore';

interface Tab {
  id: TabId;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TABS: Tab[] = [
  {
    id: 'brief',
    label: 'Brief',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        {active && <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />}
      </svg>
    ),
  },
  {
    id: 'chile',
    label: 'Chile',
    icon: (active) => (
      <span className={`text-lg leading-none ${active ? 'opacity-100' : 'opacity-50'}`}>🇨🇱</span>
    ),
  },
  {
    id: 'global',
    label: 'Global',
    icon: (active) => (
      <span className={`text-lg leading-none ${active ? 'opacity-100' : 'opacity-50'}`}>🌍</span>
    ),
  },
  {
    id: 'tech',
    label: 'Tech',
    icon: (active) => (
      <span className={`text-lg leading-none ${active ? 'opacity-100' : 'opacity-50'}`}>💻</span>
    ),
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: (active) => (
      <span className={`text-lg leading-none ${active ? 'opacity-100' : 'opacity-50'}`}>📌</span>
    ),
  },
  {
    id: 'discover',
    label: 'Discover',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <svg className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function TabBar() {
  const { activeTab, setActiveTab } = useFeedStore();

  return (
    <nav className="flex border-t border-slate-200 bg-white/95 backdrop-blur-sm overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 min-w-[52px] flex-1 transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon(isActive)}
            <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
