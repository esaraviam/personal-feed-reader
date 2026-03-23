import { create } from 'zustand';
import type { Article, Category, FeedSource } from '../domain/types';
import { parseOPML } from '../services/opml';
import { aggregateFeeds } from '../services/aggregator';
import { rankArticles } from '../services/ranking';
import {
  loadFeeds,
  saveFeeds,
  loadArticles,
  saveArticles,
  loadLastSync,
  saveLastSync,
} from '../services/db';

export type TabId = 'brief' | Category | 'settings';

interface FeedState {
  // Data
  feeds: FeedSource[];
  articles: Article[];
  lastSync: number | null;

  // UI state
  activeTab: TabId;
  loading: boolean;
  error: string | null;

  // Derived selectors
  getBriefArticles: () => Article[];
  getCategoryArticles: (category: Category) => Article[];

  // Actions
  setActiveTab: (tab: TabId) => void;
  initFromDB: () => Promise<void>;
  importOPML: (file: File) => Promise<void>;
  toggleFeed: (feedId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  feeds: [],
  articles: [],
  lastSync: null,
  activeTab: 'brief',
  loading: false,
  error: null,

  getBriefArticles: () => get().articles.slice(0, 10),

  getCategoryArticles: (category: Category) =>
    get()
      .articles.filter((a) => a.category === category)
      .slice(0, 20),

  setActiveTab: (tab) => set({ activeTab: tab }),

  initFromDB: async () => {
    set({ loading: true, error: null });
    try {
      const [feeds, articles, lastSync] = await Promise.all([
        loadFeeds(),
        loadArticles(),
        loadLastSync(),
      ]);
      set({ feeds, articles, lastSync, loading: false });
    } catch (err) {
      set({ loading: false, error: 'Failed to load saved data.' });
      console.error('[store] initFromDB error:', err);
    }
  },

  importOPML: async (file: File) => {
    set({ loading: true, error: null });
    try {
      const newFeeds = await parseOPML(file);
      if (newFeeds.length === 0) {
        set({ loading: false, error: 'No feeds found in the OPML file.' });
        return;
      }

      // Merge with existing feeds (deduplicate by id)
      const existingIds = new Set(get().feeds.map((f) => f.id));
      const merged = [...get().feeds, ...newFeeds.filter((f) => !existingIds.has(f.id))];

      await saveFeeds(merged);
      set({ feeds: merged, loading: false });

      // Auto-fetch after import
      await get().refresh();
    } catch (err) {
      set({ loading: false, error: 'Failed to import OPML file.' });
      console.error('[store] importOPML error:', err);
    }
  },

  toggleFeed: async (feedId: string) => {
    const feeds = get().feeds.map((f) =>
      f.id === feedId ? { ...f, active: !f.active } : f,
    );
    set({ feeds });
    await saveFeeds(feeds);
  },

  refresh: async () => {
    const { feeds } = get();
    if (feeds.length === 0) return;

    set({ loading: true, error: null });
    try {
      const raw = await aggregateFeeds(feeds);
      const ranked = rankArticles(raw, feeds);
      const now = Date.now();

      if (ranked.length === 0) {
        set({
          loading: false,
          error:
            'No articles loaded. All feeds may be unreachable — check the browser console for details.',
        });
        return;
      }

      await Promise.all([saveArticles(ranked), saveLastSync(now)]);
      set({ articles: ranked, lastSync: now, loading: false });
    } catch (err) {
      set({ loading: false, error: 'Failed to refresh feeds.' });
      console.error('[store] refresh error:', err);
    }
  },
}));
