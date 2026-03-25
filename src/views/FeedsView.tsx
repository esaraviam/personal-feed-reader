import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { ArticleCard } from '../components/ArticleCard';
import { StatusBanner } from '../components/StatusBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '../i18n/LanguageContext';
import { useCategories } from '../hooks/useCategories';
import { CategoryTabs } from '../components/CategoryTabs';
import { CategorySelectorSheet } from '../components/CategorySelectorSheet';

const PAGE_SIZE = 20;

export function FeedsView() {
  const { loading, error, feeds, getCategoryArticles, refresh } = useFeedStore();
  const { t } = useTranslation();

  const {
    categories,
    activeCategoryId,
    selectCategory,
    sheetOpen,
    openSheet,
    closeSheet,
    getArticleCount,
  } = useCategories();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  function handleSelectCategory(id: string) {
    selectCategory(id);
    setVisibleCount(PAGE_SIZE);
  }

  const allCategoryArticles = getCategoryArticles(activeCategoryId);
  const visibleArticles = allCategoryArticles.slice(0, visibleCount);
  const remaining = allCategoryArticles.length - visibleCount;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="flex gap-2 px-4 pt-4 pb-3 overflow-x-auto no-scrollbar">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 divide-y divide-slate-100 dark:divide-slate-700/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3.5">
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

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center gap-3">
        <span className="text-4xl">📡</span>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.feeds.noFeedsTitle}</p>
        <p className="text-sm text-slate-400 dark:text-slate-500">{t.feeds.noFeedsBody}</p>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">

      {/*
        Header row
        ──────────
        Left  → CategoryTabs (flex-1): horizontal scrollable pill strip + "All" button
        Right → Refresh button (flex-shrink-0): always visible
      */}
      <div className="flex items-center gap-2 pt-4 pb-3 pl-4 pr-4">
        <div className="flex-1 min-w-0">
          <CategoryTabs
            categories={categories}
            activeCategoryId={activeCategoryId}
            getArticleCount={getArticleCount}
            onSelect={handleSelectCategory}
            onOpenAll={openSheet}
          />
        </div>

        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="
            flex items-center gap-1 flex-shrink-0
            text-[12px] font-medium
            text-blue-600 dark:text-blue-400
            hover:text-blue-700 dark:hover:text-blue-300
            px-3 py-1.5 rounded-full
            bg-blue-50 dark:bg-blue-950/50
            hover:bg-blue-100 dark:hover:bg-blue-950
            disabled:opacity-40 transition-colors
          "
        >
          <svg
            className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.common.refresh}
        </button>
      </div>

      {/* ── Article list ──────────────────────────────────────────────────────── */}
      {allCategoryArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">{t.feeds.noArticles}</p>
        </div>
      ) : (
        <>
          <div className="mx-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none">
            {visibleArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {remaining > 0 ? (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="
                mx-4 mt-2 mb-6 py-3 rounded-xl
                border border-slate-200 dark:border-slate-700/50
                bg-white dark:bg-slate-800/50
                hover:bg-slate-50 dark:hover:bg-slate-800
                text-sm font-medium
                text-slate-500 dark:text-slate-400
                hover:text-slate-700 dark:hover:text-slate-300
                transition-colors flex items-center justify-center gap-2
              "
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {t.feeds.loadMore(Math.min(remaining, PAGE_SIZE))}
              <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                ({t.feeds.remaining(remaining)})
              </span>
            </button>
          ) : (
            <p className="text-center text-xs text-slate-300 dark:text-slate-600 py-4 mb-2">
              {t.feeds.allShown(allCategoryArticles.length)}
            </p>
          )}
        </>
      )}

      {/* ── Category selector bottom sheet ────────────────────────────────────── */}
      <CategorySelectorSheet
        open={sheetOpen}
        categories={categories}
        activeCategoryId={activeCategoryId}
        getArticleCount={getArticleCount}
        onSelect={handleSelectCategory}
        onClose={closeSheet}
      />
    </div>
  );
}
