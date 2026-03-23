import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useFeedStore } from '../store/feedStore';

function formatAge(lastSync: number): string {
  const diffMs = Date.now() - lastSync;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'a few minutes ago';
  if (diffH === 1) return '1 hour ago';
  if (diffH < 24) return `${diffH} hours ago`;
  return `${Math.floor(diffH / 24)} days ago`;
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const lastSync = useFeedStore((s) => s.lastSync);

  if (isOnline) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-700 text-xs">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M12 12h.01" />
      </svg>
      <span>
        You&apos;re offline.{' '}
        {lastSync
          ? `Showing cached data from ${formatAge(lastSync)}.`
          : 'No cached data available.'}
      </span>
    </div>
  );
}
