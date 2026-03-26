import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPrompt handles two distinct install surfaces:
 *
 * Android: captures the `beforeinstallprompt` event and shows a custom banner
 *   so the user can install the PWA to the home screen without leaving the app.
 *
 * iOS: Safari does not fire `beforeinstallprompt`. Instead, show a one-time
 *   guidance sheet explaining the manual "Add to Home Screen" flow.
 *   Shown only when running in Safari (not already in standalone mode).
 */
export function InstallPrompt() {
  const { t } = useTranslation();

  // Android deferred prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // iOS guidance sheet visibility
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Already installed as standalone — nothing to show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIos && isSafari) {
      const dismissed = localStorage.getItem('ios-install-hint-dismissed');
      if (!dismissed) setShowIosHint(true);
      return;
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  }

  function dismissAndroid() {
    setDeferredPrompt(null);
  }

  function dismissIos() {
    localStorage.setItem('ios-install-hint-dismissed', '1');
    setShowIosHint(false);
  }

  // Android install banner
  if (deferredPrompt) {
    return (
      <div
        role="banner"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 max-w-2xl mx-auto px-4 z-20"
      >
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight">{t.install.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{t.install.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={dismissAndroid}
              className="text-xs text-slate-400 dark:text-slate-500 px-2 py-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {t.install.dismiss}
            </button>
            <button
              onClick={handleAndroidInstall}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
            >
              {t.install.install}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS guidance sheet
  if (showIosHint) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 flex items-end"
        onClick={dismissIos}
      >
        <div
          className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-t-3xl px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-5" />

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{t.install.iosTitle}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.install.iosSubtitle}</p>
            </div>
          </div>

          <ol className="space-y-3 mb-6">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center">1</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{t.install.iosStep1}</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center">2</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{t.install.iosStep2}</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-bold flex items-center justify-center">3</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 pt-0.5">{t.install.iosStep3}</p>
            </li>
          </ol>

          <button
            onClick={dismissIos}
            className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
          >
            {t.install.dismiss}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
