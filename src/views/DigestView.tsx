import { useDigest } from '../hooks/useDigest';
import { ClusterCard } from '../components/ClusterCard';
import { ArticleCard } from '../components/ArticleCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '../i18n/LanguageContext';
import { useFeedStore } from '../store/feedStore';
import { WORKER_URL } from '../services/digestService';
import { haptics } from '../lib/haptics';

// ── Skeleton ──────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  return (
    <div className="px-4 pt-4 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full ml-auto" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <div key={j} className="flex gap-3">
                <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-3.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Fallback: ranked article list ─────────────────────────────────────────────

function FallbackFeed() {
  const { t } = useTranslation();
  const { getBriefArticles, refresh } = useFeedStore();
  const articles = getBriefArticles();

  return (
    <div className="flex flex-col min-h-full">
      {/* Notice banner */}
      <div className="mx-4 mt-4 mb-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-4 py-3 flex items-start gap-3">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
          {t.digest.fallbackNotice}
        </p>
      </div>
      {articles.length > 0 ? (
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
          {articles.map((article, i) => (
            <ArticleCard key={article.id} article={article} rank={i + 1} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm text-slate-400 dark:text-slate-500">{t.brief.noArticles}</p>
          <button
            onClick={() => { haptics.tap(); void refresh(); }}
            className="text-[12px] text-blue-600 dark:text-blue-400 font-medium"
          >
            {t.common.refresh}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

function formatGeneratedAt(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return 'just now';
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export function DigestView() {
  const { t } = useTranslation();
  const { digest, loading, error, refresh } = useDigest();

  // No Worker configured — show fallback
  if (!WORKER_URL) {
    return <FallbackFeed />;
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t.digest.title}
          </h2>
          {digest && digest.generatedAt > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {t.digest.updatedAt(formatGeneratedAt(digest.generatedAt))}
            </p>
          )}
        </div>
        <button
          onClick={() => { haptics.tap(); void refresh(); }}
          disabled={loading}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors disabled:opacity-40"
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.common.refresh}
        </button>
      </div>

      {/* ── States ─────────────────────────────────────────────────────── */}
      {loading && <DigestSkeleton />}

      {!loading && error && (
        <div className="mx-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 px-4 py-4 flex flex-col items-center gap-2 text-center">
          <p className="text-[13px] font-medium text-red-700 dark:text-red-300">{t.digest.errorTitle}</p>
          <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>
          <button
            onClick={() => { haptics.tap(); void refresh(); }}
            className="mt-1 text-[12px] text-red-600 dark:text-red-400 font-medium underline"
          >
            {t.digest.retry}
          </button>
        </div>
      )}

      {!loading && !error && digest && digest.clusters.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-slate-700 dark:text-slate-300">{t.digest.emptyTitle}</p>
          <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">{t.digest.emptyBody}</p>
        </div>
      )}

      {!loading && !error && digest && digest.clusters.length > 0 && (
        <div className="px-4 pb-4">
          {digest.clusters.map((cluster) => (
            <ClusterCard key={cluster.id} cluster={cluster} />
          ))}
        </div>
      )}
    </div>
  );
}
