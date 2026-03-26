import { lazy, Suspense, useEffect } from 'react';
import { useFeedStore, type TabId } from './store/feedStore';
import { TabBar } from './components/TabBar';
import { OfflineBanner } from './components/OfflineBanner';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme } from './hooks/useTheme';
import { LanguageProvider, useTranslation } from './i18n/LanguageContext';
import type { Language } from './i18n/translations';
import { Toaster } from 'sonner';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { OnboardingFlow } from './components/OnboardingFlow';
import { InstallPrompt } from './components/InstallPrompt';

/*
 * Lazy-load non-initial views so the initial bundle only parses HomeView.
 * The hidden views (opacity-0) load in the background immediately after mount —
 * users never see a flash because they're invisible until switched to.
 */
const HomeView     = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const DigestView   = lazy(() => import('./views/DigestView').then(m => ({ default: m.DigestView })));
const FeedsView    = lazy(() => import('./views/FeedsView').then(m => ({ default: m.FeedsView })));
const DiscoverView = lazy(() => import('./views/DiscoverView').then(m => ({ default: m.DiscoverView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })));

const ALL_TABS: TabId[] = ['brief', 'digest', 'feeds', 'discover', 'settings'];

function AppShell() {
  const { initFromDB, refresh, feeds, activeTab } = useFeedStore();
  const isOnline = useOnlineStatus();
  const { theme, toggle: toggleTheme } = useTheme();
  const { language, setLanguage, t } = useTranslation();
  const { done: onboardingDone, complete: completeOnboarding } = useOnboarding();

  useEffect(() => {
    void initFromDB();
  }, [initFromDB]);

  useEffect(() => {
    if (isOnline && feeds.length > 0) {
      void refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const LANGS: { id: Language; label: string }[] = [
    { id: 'en', label: 'EN' },
    { id: 'es', label: 'ES' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">

      {/*
        App header.
        pt-[env(safe-area-inset-top)] compensates for the black-translucent status bar
        on iOS — without this, the header content sits under the status bar text/icons.
      */}
      <header
        className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 pb-3 flex items-center gap-2.5 sticky top-0 z-10 shadow-[0_1px_0_0_#f1f5f9] dark:shadow-[0_1px_0_0_#1e293b]"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
      >
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <h1 className="text-[15px] font-semibold text-slate-900 dark:text-slate-50 tracking-tight">Daily Brief</h1>

        <div className="ml-auto flex items-center gap-1.5">
          {!isOnline && (
            <span className="text-[11px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {t.app.offline}
            </span>
          )}

          {/* Language toggle */}
          <div className="flex items-center rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden">
            {LANGS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLanguage(id)}
                aria-label={`Switch to ${id === 'en' ? 'English' : 'Spanish'}`}
                className={`px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors active:scale-95 ${
                  language === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-90"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <OfflineBanner />

      {/*
        Main content area.
        All four tab views are mounted simultaneously and stacked via absolute positioning.
        The active tab is opacity-100 + pointer-events-auto; others are opacity-0 + pointer-events-none.

        Benefits vs conditional rendering:
          - Cross-fade transition instead of instant cut (native-like)
          - Each view has its own scroll container → scroll position preserved across tab switches
          - No remount/unmount flash on tab switch
      */}
      {/*
        The scroll clearance MUST live on each individual scroll container, not on <main>.
        Reason: children with `absolute inset-0` are positioned relative to <main>'s padding
        edge — they fill the full height including padding-bottom, so padding on <main>
        never creates scroll clearance. Moving it to the overflow-y:auto containers
        ensures the browser reserves that space at the bottom of each scrollable list.
      */}
      <main className="flex-1 max-w-2xl w-full mx-auto relative overflow-hidden">
        {ALL_TABS.map((tab) => (
          <div
            key={tab}
            aria-hidden={activeTab !== tab}
            style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            className={`absolute inset-0 overflow-y-auto transition-opacity duration-200 ${
              activeTab === tab
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            <Suspense fallback={null}>
              {tab === 'brief'    && <HomeView />}
              {tab === 'digest'   && <DigestView />}
              {tab === 'feeds'    && <FeedsView />}
              {tab === 'discover' && <DiscoverView />}
              {tab === 'settings' && <SettingsView />}
            </Suspense>
          </div>
        ))}
      </main>

      {/* TabBar: pb-safe pushes content above the iPhone home indicator */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto z-10">
        <TabBar />
      </div>

      <Toaster position="top-center" richColors theme={theme} />

      {/* Onboarding overlay — shown only on first launch */}
      {!onboardingDone && <OnboardingFlow onComplete={completeOnboarding} />}

      {/* Install prompt — Android banner + iOS guidance sheet */}
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <OnboardingProvider>
        <AppShell />
      </OnboardingProvider>
    </LanguageProvider>
  );
}
