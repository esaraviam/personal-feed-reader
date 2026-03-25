import { useState, useEffect, useCallback } from 'react';
import { useFeedStore } from '../store/feedStore';
import { searchFeeds, type FeedSearchResult } from '../services/feedSearch';
import {
  getRecommendedFeeds,
  type RecommendedFeed,
} from '../services/recommendations';
import { buildFeedSource } from '../services/feedValidator';
import type { CategoryId } from '../domain/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '../i18n/LanguageContext';

const INITIAL_VISIBLE = 6;

export function DiscoverView() {
  const { feeds, categories, addFeed, loading, refresh } = useFeedStore();
  const { t, language } = useTranslation();

  const existingIds = new Set(feeds.map((f) => f.id));
  const existingUrls = new Set(feeds.map((f) => f.url.toLowerCase()));

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const defaultCategoryId: CategoryId = sortedCategories[0]?.id ?? 'custom';

  // ── Search state ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // ── Recommendations state ───────────────────────────────────────────────────
  const [recommended, setRecommended] = useState<RecommendedFeed[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  const [langFilter, setLangFilter] = useState<'mine' | 'all'>('mine');
  const [showAll, setShowAll] = useState(false);

  // ── Add state (shared between search results & recommendations) ─────────────
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, CategoryId>>({});

  // Load recommendations on mount and whenever language filter changes
  const loadRecommendations = useCallback(async () => {
    setRecLoading(true);
    try {
      const feeds = await getRecommendedFeeds(language, existingUrls, langFilter);
      setRecommended(feeds);
    } catch {
      setRecommended([]);
    } finally {
      setRecLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, langFilter]);

  useEffect(() => { void loadRecommendations(); }, [loadRecommendations]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const data = await searchFeeds(query);
      if (data.length === 0) setSearchError(t.discover.noResults);
      setResults(data);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery('');
    setResults([]);
    setSearchError(null);
  }

  async function handleAdd(url: string, title: string) {
    const id = url.toLowerCase();
    const categoryId = selectedCategory[id] ?? defaultCategoryId;
    setAddingId(id);
    try {
      const feed = buildFeedSource({ url, name: title }, categoryId);
      await addFeed(feed);
      setAddedIds((prev) => new Set(prev).add(id));
    } finally {
      setAddingId(null);
    }
  }

  function categoryFor(id: string): CategoryId {
    return selectedCategory[id] ?? defaultCategoryId;
  }

  const visibleRecommended = showAll ? recommended : recommended.slice(0, INITIAL_VISIBLE);
  const isSearchActive = query.trim().length > 0 || results.length > 0;

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 min-h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">{t.discover.title}</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.discover.subtitle}</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading || feeds.length === 0}
          className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 disabled:opacity-40 transition-colors"
        >
          <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.common.refresh}
        </button>
      </div>

      {/* Search form */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.discover.placeholder}
              className="w-full px-3 py-2 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            {isSearchActive && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {searching ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            )}
            {searching ? t.discover.searching : t.discover.search}
          </button>
        </form>
      </div>

      {/* Search error */}
      {searchError && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-slate-400">{searchError}</p>
        </div>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <ul className="divide-y divide-gray-50 dark:divide-slate-800">
          {results.map((result) => {
            const id = result.url.toLowerCase();
            const isAdded = addedIds.has(id) || existingIds.has(id);
            const isAdding = addingId === id;
            return (
              <FeedRow
                key={id}
                id={id}
                title={result.title}
                description={result.description}
                favicon={result.favicon}
                url={result.url}
                subscribers={result.subscribers}
                isAdded={isAdded}
                isAdding={isAdding}
                categoryId={categoryFor(id)}
                sortedCategories={sortedCategories}
                onCategoryChange={(v) => setSelectedCategory((p) => ({ ...p, [id]: v }))}
                onAdd={() => void handleAdd(result.url, result.title)}
                t={t}
              />
            );
          })}
        </ul>
      )}

      {/* Recommendations (shown when search is inactive) */}
      {!isSearchActive && (
        <div className="flex flex-col">
          {/* Section header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.discover.recommendedTitle}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.discover.recommendedSubtitle}</p>
            </div>
            {/* Language filter toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setLangFilter('mine')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  langFilter === 'mine'
                    ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {t.discover.yourLanguage}
              </button>
              <button
                onClick={() => setLangFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  langFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {t.discover.allLanguages}
              </button>
            </div>
          </div>

          {/* Feed list */}
          {recLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-gray-200 dark:border-slate-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : recommended.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm text-gray-400 dark:text-slate-500">{t.discover.emptyHint}</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                {visibleRecommended.map((feed) => {
                  const id = feed.url.toLowerCase();
                  const isAdded = addedIds.has(id) || existingIds.has(id);
                  const isAdding = addingId === id;
                  return (
                    <FeedRow
                      key={id}
                      id={id}
                      title={feed.title}
                      description={feed.description}
                      favicon={feed.favicon}
                      url={feed.url}
                      subscribers={feed.subscribers}
                      tier={feed.tier}
                      isAdded={isAdded}
                      isAdding={isAdding}
                      categoryId={categoryFor(id)}
                      sortedCategories={sortedCategories}
                      onCategoryChange={(v) => setSelectedCategory((p) => ({ ...p, [id]: v }))}
                      onAdd={() => void handleAdd(feed.url, feed.title)}
                      t={t}
                    />
                  );
                })}
              </ul>

              {/* Show more / less */}
              {recommended.length > INITIAL_VISIBLE && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="mx-4 my-3 py-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline text-center"
                >
                  {showAll
                    ? t.discover.showLess
                    : `${t.discover.showMore} (${recommended.length - INITIAL_VISIBLE})`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state — search, no results, no error */}
      {isSearchActive && !searching && results.length === 0 && !searchError && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.discover.emptyHint}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.discover.poweredBy}</p>
        </div>
      )}
    </div>
  );
}

// ─── Shared FeedRow component ────────────────────────────────────────────────

interface FeedRowProps {
  id: string;
  title: string;
  description: string | null;
  favicon: string | null;
  url: string;
  subscribers: number | null;
  tier?: string;
  isAdded: boolean;
  isAdding: boolean;
  categoryId: CategoryId;
  sortedCategories: { id: string; icon: string; name: string }[];
  onCategoryChange: (v: CategoryId) => void;
  onAdd: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function FeedRow({
  id: _id, title, description, favicon, url, subscribers, tier,
  isAdded, isAdding, categoryId, sortedCategories,
  onCategoryChange, onAdd, t,
}: FeedRowProps) {
  return (
    <li className="px-4 py-3 flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Favicon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
        {favicon ? (
          <img
            src={favicon}
            alt=""
            className="w-5 h-5 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="text-xs text-gray-400 dark:text-slate-500">RSS</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{title}</p>
          {tier === 'featured' && (
            <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              ★
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-2 mt-0.5">{description}</p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-300 dark:text-slate-600 truncate">{url}</p>
          {subscribers != null && subscribers > 0 && (
            <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
              {t.discover.subscribers(subscribers)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
        {isAdded ? (
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {t.discover.added}
          </span>
        ) : (
          <>
            <Select value={categoryId} onValueChange={onCategoryChange}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={onAdd}
              disabled={isAdding}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {isAdding ? (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
              {isAdding ? t.discover.adding : t.discover.add}
            </button>
          </>
        )}
      </div>
    </li>
  );
}
