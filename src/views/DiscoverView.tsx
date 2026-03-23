import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { searchFeeds, type FeedSearchResult } from '../services/feedSearch';
import { buildFeedSource } from '../services/feedValidator';
import type { Category } from '../domain/types';

const CATEGORIES: Category[] = ['chile', 'global', 'tech', 'custom'];
const CATEGORY_LABELS: Record<Category, string> = {
  chile: '🇨🇱 Chile',
  global: '🌍 Global',
  tech: '💻 Tech',
  custom: '📌 Custom',
};

export function DiscoverView() {
  const { feeds, addFeed } = useFeedStore();
  const existingIds = new Set(feeds.map((f) => f.id));

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FeedSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Record<string, Category>>({});

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    try {
      const data = await searchFeeds(query);
      if (data.length === 0) setSearchError('No feeds found. Try a different search term.');
      setResults(data);
    } catch (err) {
      setSearchError((err as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(result: FeedSearchResult) {
    const id = result.url.toLowerCase();
    const category = selectedCategory[id] ?? 'custom';
    setAddingId(id);
    try {
      const feed = buildFeedSource({ url: result.url, name: result.title }, category);
      await addFeed(feed);
      setAddedIds((prev) => new Set(prev).add(id));
    } finally {
      setAddingId(null);
    }
  }

  function categoryFor(id: string): Category {
    return selectedCategory[id] ?? 'custom';
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Discover Feeds</h2>
        <p className="text-xs text-gray-400 mt-0.5">Search for RSS feeds by topic, publication, or website name.</p>
      </div>

      {/* Search form */}
      <div className="p-4 border-b border-gray-100">
        <form onSubmit={(e) => void handleSearch(e)} className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. BBC, TechCrunch, AI, economics…"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>
      </div>

      {/* Error */}
      {searchError && (
        <div className="px-4 py-3">
          <p className="text-sm text-gray-500">{searchError}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {results.map((result) => {
            const id = result.url.toLowerCase();
            const isAdded = addedIds.has(id) || existingIds.has(id);
            const isAdding = addingId === id;

            return (
              <li key={id} className="px-4 py-3 flex gap-3 items-start">
                {/* Favicon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                  {result.favicon ? (
                    <img
                      src={result.favicon}
                      alt=""
                      className="w-5 h-5 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">RSS</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                  {result.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{result.description}</p>
                  )}
                  <p className="text-xs text-gray-300 truncate mt-0.5">{result.url}</p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  {isAdded ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 py-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Added
                    </span>
                  ) : (
                    <>
                      <select
                        value={categoryFor(id)}
                        onChange={(e) =>
                          setSelectedCategory((prev) => ({
                            ...prev,
                            [id]: e.target.value as Category,
                          }))
                        }
                        className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                        ))}
                      </select>
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
                        {isAdding ? 'Adding…' : 'Add'}
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
          <p className="text-sm text-gray-500">Search for any topic or publication to find RSS feeds.</p>
          <p className="text-xs text-gray-400 mt-1">Powered by feedsearch.dev</p>
        </div>
      )}
    </div>
  );
}
