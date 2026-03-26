import { useEffect, useRef } from 'react';
import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '../i18n/LanguageContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { haptics } from '../lib/haptics';

function formatSyncTime(ts: number, t: ReturnType<typeof useTranslation>['t']): string {
  const diffM = Math.floor((Date.now() - ts) / 60000);
  if (diffM < 1) return t.syncTime.justNow;
  if (diffM < 60) return t.syncTime.minutesAgo(diffM);
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
}

export function HomeView() {
  const { loading, error, lastSync, feeds, getBriefArticles, refresh } = useFeedStore();
  const { t } = useTranslation();
  const articles = getBriefArticles();

  // Pull-to-refresh: attach to the parent scroll container (managed by App.tsx)
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    scrollContainerRef.current = (rootRef.current?.parentElement ?? null) as HTMLElement | null;
  }, []);
  const { pullProgress, refreshing } = usePullToRefresh(scrollContainerRef, {
    onRefresh: async () => {
      haptics.success();
      await refresh();
    },
  });

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-36" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 divide-y divide-slate-100 dark:divide-slate-700/50 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5">
              <Skeleton className="h-5 w-5 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <StatusBanner type="error" message={error} />;

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
        <span className="text-4xl">📡</span>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.brief.noFeedsTitle}</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">{t.brief.noFeedsBody}</p>
      </div>
    );
  }

  const activeCount = feeds.filter(f => f.active).length;

  return (
    <div ref={rootRef} className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
      {/* Pull-to-refresh indicator */}
      {(pullProgress > 0 || refreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: `${(refreshing ? 1 : pullProgress) * 44}px` }}
        >
          <svg
            className={`w-5 h-5 text-blue-500 transition-transform duration-300 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${pullProgress * 360}deg)` }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      )}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t.brief.topStories}
          </h2>
          {lastSync && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {t.brief.feedsUpdated(activeCount, formatSyncTime(lastSync, t))}
            </p>
          )}
        </div>
        <button
          onClick={() => void refresh()}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.common.refresh}
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-slate-400 dark:text-slate-500">{t.brief.noArticles}</p>
        </div>
      ) : (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
