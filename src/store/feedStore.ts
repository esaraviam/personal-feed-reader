import { create } from 'zustand';
import type { Article, CategoryId, FeedSource, UserCategory } from '../domain/types';
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
  loadCategories,
  saveCategories,
} from '../services/db';

export type TabId = 'brief' | 'feeds' | 'discover' | 'settings';

interface FeedState {
  // Data
  categories: UserCategory[];
  feeds: FeedSource[];
  articles: Article[];
  lastSync: number | null;

  // UI state
  activeTab: TabId;
  activeCategoryId: CategoryId;
  loading: boolean;
  error: string | null;

  // Derived selectors
  getBriefArticles: () => Article[];
  getCategoryArticles: (categoryId: CategoryId) => Article[];
  getCategoryById: (id: CategoryId) => UserCategory | undefined;
  getCategoryMap: () => Map<CategoryId, UserCategory>;

  // Actions
  setActiveTab: (tab: TabId) => void;
  setActiveCategoryId: (categoryId: CategoryId) => void;
  initFromDB: () => Promise<void>;
  importOPML: (file: File) => Promise<void>;
  addFeed: (feed: FeedSource) => Promise<void>;
  removeFeed: (feedId: string) => Promise<void>;
  updateFeedCategory: (feedId: string, categoryId: CategoryId) => Promise<void>;
  toggleFeed: (feedId: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Category CRUD (Phase 2 — stubs defined, fully implemented in feedStore v2)
  createCategory: (name: string, color: string, icon: string) => Promise<UserCategory>;
  updateCategory: (id: CategoryId, patch: Partial<Pick<UserCategory, 'name' | 'color' | 'icon' | 'order'>>) => Promise<void>;
  deleteCategory: (id: CategoryId, reassignTo: CategoryId) => Promise<void>;
  reorderCategories: (orderedIds: CategoryId[]) => Promise<void>;
}

/** Returns up to `n` articles per source, preserving ranked order. */
function topPerSource(articles: Article[], n: number): Article[] {
  const counts = new Map<string, number>();
  const result: Article[] = [];
  for (const article of articles) {
    const count = counts.get(article.source) ?? 0;
    if (count < n) {
      result.push(article);
      counts.set(article.source, count + 1);
    }
  }
  return result;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  categories: [],
  feeds: [],
  articles: [],
  lastSync: null,
  activeTab: 'brief',
  activeCategoryId: 'chile',
  loading: false,
  error: null,

  getBriefArticles: () => topPerSource(get().articles, 5),

  getCategoryArticles: (categoryId: CategoryId) =>
    topPerSource(
      get().articles.filter((a) => a.categoryId === categoryId),
      30,
    ),

  getCategoryById: (id: CategoryId) =>
    get().categories.find((c) => c.id === id),

  getCategoryMap: () =>
    new Map(get().categories.map((c) => [c.id, c])),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveCategoryId: (categoryId) => set({ activeCategoryId: categoryId }),

  initFromDB: async () => {
    set({ loading: true, error: null });
    try {
      const [feeds, articles, lastSync, categories] = await Promise.all([
        loadFeeds(),
        loadArticles(),
        loadLastSync(),
        loadCategories(),
      ]);
      set({ feeds, articles, lastSync, categories, loading: false });
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

      const existingIds = new Set(get().feeds.map((f) => f.id));
      const merged = [...get().feeds, ...newFeeds.filter((f) => !existingIds.has(f.id))];

      await saveFeeds(merged);
      set({ feeds: merged, loading: false });

      await get().refresh();
    } catch (err) {
      set({ loading: false, error: 'Failed to import OPML file.' });
      console.error('[store] importOPML error:', err);
    }
  },

  addFeed: async (feed: FeedSource) => {
    const existing = get().feeds;
    if (existing.some((f) => f.id === feed.id)) return;
    const feeds = [...existing, feed];
    await saveFeeds(feeds);
    set({ feeds });
    await get().refresh();
  },

  removeFeed: async (feedId: string) => {
    const feeds = get().feeds.filter((f) => f.id !== feedId);
    await saveFeeds(feeds);
    set({ feeds });
  },

  updateFeedCategory: async (feedId: string, categoryId: CategoryId) => {
    const feeds = get().feeds.map((f) => f.id === feedId ? { ...f, categoryId } : f);
    await saveFeeds(feeds);
    set({ feeds });
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

  // ── Category CRUD ──────────────────────────────────────────────────────────
  // Fully implemented below. Validation is enforced before any mutation.

  createCategory: async (name: string, color: string, icon: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Category name cannot be empty.');
    if (trimmed.length > 32) throw new Error('Category name too long (max 32 characters).');

    const { categories } = get();
    if (categories.length >= 20) throw new Error('Maximum 20 categories allowed.');
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error('A category with this name already exists.');
    }

    // Use timestamp + random suffix as ID — nanoid will replace this in Phase 2
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newCat: UserCategory = {
      id,
      name: trimmed,
      color,
      icon,
      order: categories.length,
      isDefault: false,
      createdAt: Date.now(),
    };
    const updated = [...categories, newCat];
    await saveCategories(updated);
    set({ categories: updated });
    return newCat;
  },

  updateCategory: async (id: CategoryId, patch) => {
    const { categories } = get();
    const cat = categories.find((c) => c.id === id);
    if (!cat) throw new Error('Category not found.');

    if (patch.name !== undefined) {
      const trimmed = patch.name.trim();
      if (!trimmed) throw new Error('Category name cannot be empty.');
      if (trimmed.length > 32) throw new Error('Category name too long (max 32 characters).');
      if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error('A category with this name already exists.');
      }
      patch = { ...patch, name: trimmed };
    }

    const updated = categories.map((c) => c.id === id ? { ...c, ...patch } : c);
    await saveCategories(updated);
    set({ categories: updated });
  },

  deleteCategory: async (id: CategoryId, reassignTo: CategoryId) => {
    const { categories, feeds, articles, activeCategoryId } = get();
    const cat = categories.find((c) => c.id === id);

    if (!cat) throw new Error('Category not found.');
    if (cat.isDefault) throw new Error('Default categories cannot be deleted.');
    if (id === reassignTo) throw new Error('Cannot reassign to the category being deleted.');
    if (!categories.some((c) => c.id === reassignTo)) throw new Error('Target category not found.');

    const updatedFeeds    = feeds.map((f) => f.categoryId === id ? { ...f, categoryId: reassignTo } : f);
    const updatedArticles = articles.map((a) => a.categoryId === id ? { ...a, categoryId: reassignTo } : a);
    const updatedCategories = categories
      .filter((c) => c.id !== id)
      .map((c, i) => ({ ...c, order: i }));

    await Promise.all([
      saveCategories(updatedCategories),
      saveFeeds(updatedFeeds),
      saveArticles(updatedArticles),
    ]);

    set({
      categories: updatedCategories,
      feeds: updatedFeeds,
      articles: updatedArticles,
      activeCategoryId: activeCategoryId === id ? reassignTo : activeCategoryId,
    });
  },

  reorderCategories: async (orderedIds: CategoryId[]) => {
    const { categories } = get();
    const updated = orderedIds
      .map((id, i) => {
        const cat = categories.find((c) => c.id === id);
        return cat ? { ...cat, order: i } : null;
      })
      .filter((c): c is UserCategory => c !== null);
    await saveCategories(updated);
    set({ categories: updated });
  },
}));
