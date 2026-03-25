import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useFeedStore } from '../store/feedStore';
import { useTranslation } from '../i18n/LanguageContext';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const lastSync = useFeedStore((s) => s.lastSync);
  const { t } = useTranslation();

  if (isOnline) return null;

  function formatAge(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffH = diffMs / (1000 * 60 * 60);
    if (diffH < 1) return t.offline.timeAgo.fewMinutes;
    if (diffH < 2) return t.offline.timeAgo.oneHour;
    if (diffH < 24) return t.offline.timeAgo.hours(Math.floor(diffH));
    return t.offline.timeAgo.days(diffH / 24);
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900 px-4 py-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M12 12h.01" />
      </svg>
      <span>
        {t.offline.message}{' '}
        {lastSync ? t.offline.cached(formatAge(lastSync)) : t.offline.noCache}
      </span>
    </div>
  );
}
