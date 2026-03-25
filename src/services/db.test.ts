import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  saveFeeds, loadFeeds,
  saveArticles, loadArticles,
  saveLastSync, loadLastSync,
  saveCategories, loadCategories,
} from './db';
import type { Article, FeedSource, UserCategory } from '../domain/types';
import { DEFAULT_CATEGORIES } from './categories';

const feedA: FeedSource = {
  id: 'https://example.com/rss',
  name: 'Example',
  url: 'https://example.com/rss',
  categoryId: 'tech',
  active: true,
  priority: 1,
};

const feedB: FeedSource = {
  id: 'https://news.ycombinator.com/rss',
  name: 'Hacker News',
  url: 'https://news.ycombinator.com/rss',
  categoryId: 'tech',
  active: true,
  priority: 2,
};

const article: Article = {
  id: 'https://example.com/article-1',
  title: 'Test Article',
  link: 'https://example.com/article-1',
  source: 'Example',
  categoryId: 'tech',
  publishedAt: Date.now(),
  score: 5,
};

const customCategory: UserCategory = {
  id: 'sports',
  name: 'Sports',
  color: '#22c55e',
  icon: '⚽',
  order: 4,
  isDefault: false,
  createdAt: Date.now(),
};

describe('db persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
  });

  // ── Feeds ─────────────────────────────────────────────────────────────────

  it('saves and loads feeds', async () => {
    await saveFeeds([feedA, feedB]);
    const result = await loadFeeds();
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toContain(feedA.id);
    expect(result.map((f) => f.id)).toContain(feedB.id);
  });

  it('feeds use categoryId field (not category)', async () => {
    await saveFeeds([feedA]);
    const result = await loadFeeds();
    expect(result[0]).toHaveProperty('categoryId', 'tech');
    expect(result[0]).not.toHaveProperty('category');
  });

  it('overwrites feeds on subsequent saves', async () => {
    await saveFeeds([feedA, feedB]);
    await saveFeeds([feedA]);
    const result = await loadFeeds();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(feedA.id);
  });

  it('returns empty array when no feeds saved', async () => {
    const result = await loadFeeds();
    expect(result).toEqual([]);
  });

  // ── Articles ──────────────────────────────────────────────────────────────

  it('saves and loads articles', async () => {
    await saveArticles([article]);
    const result = await loadArticles();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(article.id);
    expect(result[0].title).toBe(article.title);
  });

  it('articles use categoryId field (not category)', async () => {
    await saveArticles([article]);
    const result = await loadArticles();
    expect(result[0]).toHaveProperty('categoryId', 'tech');
    expect(result[0]).not.toHaveProperty('category');
  });

  it('overwrites articles on subsequent saves', async () => {
    const article2 = { ...article, id: 'https://example.com/article-2' };
    await saveArticles([article, article2]);
    await saveArticles([article]);
    const result = await loadArticles();
    expect(result).toHaveLength(1);
  });

  // ── Meta ──────────────────────────────────────────────────────────────────

  it('saves and loads lastSync timestamp', async () => {
    const ts = 1742731200000;
    await saveLastSync(ts);
    const result = await loadLastSync();
    expect(result).toBe(ts);
  });

  it('returns null for lastSync when never set', async () => {
    const result = await loadLastSync();
    expect(result).toBeNull();
  });

  // ── Categories ────────────────────────────────────────────────────────────

  it('fresh DB seeds DEFAULT_CATEGORIES automatically', async () => {
    const result = await loadCategories();
    expect(result).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(result.map((c) => c.id)).toContain('chile');
    expect(result.map((c) => c.id)).toContain('global');
    expect(result.map((c) => c.id)).toContain('tech');
    expect(result.map((c) => c.id)).toContain('custom');
  });

  it('saves and loads categories', async () => {
    const updated = [...DEFAULT_CATEGORIES, customCategory];
    await saveCategories(updated);
    const result = await loadCategories();
    expect(result).toHaveLength(5);
    expect(result.map((c) => c.id)).toContain('sports');
  });

  it('overwrites categories on subsequent saves', async () => {
    await saveCategories([DEFAULT_CATEGORIES[0]]);
    const result = await loadCategories();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('chile');
  });

  it('default categories have required fields', async () => {
    const result = await loadCategories();
    for (const cat of result) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('icon');
      expect(cat).toHaveProperty('order');
      expect(cat.isDefault).toBe(true);
    }
  });

  // ── v1 → v2 migration ─────────────────────────────────────────────────────

  it('migrates v1 records: renames category → categoryId on feeds and articles', async () => {
    // 1. Create a v1-shaped DB with the old `category` field
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('daily-brief', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('feeds', { keyPath: 'id' });
        db.createObjectStore('articles', { keyPath: 'id' });
        db.createObjectStore('meta');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['feeds', 'articles'], 'readwrite');
        tx.objectStore('feeds').put({
          id: 'https://example.com/rss',
          name: 'Example',
          url: 'https://example.com/rss',
          category: 'tech',   // v1 field name
          active: true,
          priority: 1,
        });
        tx.objectStore('articles').put({
          id: 'https://example.com/a1',
          title: 'Article',
          link: 'https://example.com/a1',
          source: 'Example',
          category: 'tech',   // v1 field name
          publishedAt: 0,
          score: 0,
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });

    // 2. Open via our v2 module — triggers the upgrade migration
    const feeds = await loadFeeds();
    const articles = await loadArticles();

    // 3. Verify field was renamed and old field is gone
    expect(feeds[0]).toHaveProperty('categoryId', 'tech');
    expect(feeds[0]).not.toHaveProperty('category');
    expect(articles[0]).toHaveProperty('categoryId', 'tech');
    expect(articles[0]).not.toHaveProperty('category');
  });
});
