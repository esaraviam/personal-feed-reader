import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { searchFeeds, type FeedSearchResult } from '../services/feedSearch';
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

export function DiscoverView() {
  const { feeds, categories, addFeed, loading, refresh } = useFeedStore();
  const { t } = useTranslation();
  const existingIds = new Set(feeds.map((f) => f.id));

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const defaultCategoryId: CategoryId = sortedCategories[0]?.id ?? 'custom';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, CategoryId>>({});

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

  async function handleAdd(result: FeedSearchResult) {
    const id = result.url.toLowerCase();
    const categoryId = selectedCategory[id] ?? defaultCategoryId;
    setAddingId(id);
    try {
      const feed = buildFeedSource({ url: result.url, name: result.title }, categoryId);
      await addFeed(feed);
      setAddedIds((prev) => new Set(prev).add(id));
    } finally {
      setAddingId(null);
    }
  }

  function categoryFor(id: string): CategoryId {
    return selectedCategory[id] ?? defaultCategoryId;
  }

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
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.discover.placeholder}
            className="flex-1 px-3 py-2 text-base border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
          />
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

      {/* Error */}
      {searchError && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-500 dark:text-slate-400">{searchError}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-gray-50 dark:divide-slate-800">
          {results.map((result) => {
            const id = result.url.toLowerCase();
            const isAdded = addedIds.has(id) || existingIds.has(id);
            const isAdding = addingId === id;

            return (
              <li key={id} className="px-4 py-3 flex gap-3 items-start hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                {/* Favicon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                  {result.favicon ? (
                    <img
                      src={result.favicon}
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
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{result.title}</p>
                  {result.description && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 line-clamp-2 mt-0.5">{result.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-300 dark:text-slate-600 truncate">{result.url}</p>
                    {result.subscribers != null && result.subscribers > 0 && (
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {t.discover.subscribers(result.subscribers)}
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
                      <Select
                        value={categoryFor(id)}
                        onValueChange={(v) =>
                          setSelectedCategory((prev) => ({
                            ...prev,
                            [id]: v as CategoryId,
                          }))
                        }
                      >
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
                        onClick={() => void handleAdd(result)}
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
          })}
        </ul>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && !searchError && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <span className="text-4xl mb-3">🔍</span>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.discover.emptyHint}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t.discover.poweredBy}</p>
        </div>
      )}
    </div>
  );
}
