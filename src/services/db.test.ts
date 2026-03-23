import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { saveFeeds, loadFeeds, saveArticles, loadArticles, saveLastSync, loadLastSync } from './db';
import type { Article, FeedSource } from '../domain/types';

const feedA: FeedSource = {
  id: 'https://example.com/rss',
  name: 'Example',
  url: 'https://example.com/rss',
  category: 'tech',
  active: true,
  priority: 1,
};

const feedB: FeedSource = {
  id: 'https://news.ycombinator.com/rss',
  name: 'Hacker News',
  url: 'https://news.ycombinator.com/rss',
  category: 'tech',
  active: true,
  priority: 2,
};

const article: Article = {
  id: 'https://example.com/article-1',
  title: 'Test Article',
  link: 'https://example.com/article-1',
  source: 'Example',
  category: 'tech',
  publishedAt: Date.now(),
  score: 5,
};

describe('db persistence', () => {
  beforeEach(() => {
    // Reset the global IndexedDB between tests
    vi.stubGlobal('indexedDB', new IDBFactory());
  });

  it('saves and loads feeds', async () => {
    await saveFeeds([feedA, feedB]);
    const result = await loadFeeds();
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toContain(feedA.id);
    expect(result.map((f) => f.id)).toContain(feedB.id);
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

  it('saves and loads articles', async () => {
    await saveArticles([article]);
    const result = await loadArticles();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(article.id);
    expect(result[0].title).toBe(article.title);
  });

  it('overwrites articles on subsequent saves', async () => {
    const article2 = { ...article, id: 'https://example.com/article-2' };
    await saveArticles([article, article2]);
    await saveArticles([article]);
    const result = await loadArticles();
    expect(result).toHaveLength(1);
  });

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
});
