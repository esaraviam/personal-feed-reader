import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rankArticles } from './ranking';
import type { Article, FeedSource } from '../domain/types';

const NOW = new Date('2026-03-23T12:00:00Z').getTime();

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: 'https://example.com/1',
    title: 'Generic Article',
    link: 'https://example.com/1',
    source: 'Example',
    category: 'tech',
    publishedAt: NOW - 30 * 60 * 1000, // 30 min ago → recency +3
    score: 0,
    ...overrides,
  };
}

const source: FeedSource = {
  id: 'example',
  name: 'Example',
  url: 'https://example.com/rss',
  category: 'tech',
  active: true,
  priority: 1,
};

describe('rankArticles', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns articles sorted by score descending', () => {
    const a1 = makeArticle({ id: '1', title: 'AI regulation news', publishedAt: NOW - 1 * 60 * 60 * 1000 }); // keyword×2 + recency3 + priority1 = 6
    const a2 = makeArticle({ id: '2', title: 'Weather update', publishedAt: NOW - 30 * 60 * 60 * 1000 }); // 0 + 0 + 1 = 1

    const result = rankArticles([a2, a1], [source]);
    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });

  it('applies keyword match × 2', () => {
    const article = makeArticle({ title: 'AI and economy report' }); // 2 keywords → +4
    const [ranked] = rankArticles([article], [source]);
    // score = 2*2 + 3 + 1 = 8
    expect(ranked.score).toBe(8);
  });

  it('assigns recency +3 for articles under 6h', () => {
    const article = makeArticle({ publishedAt: NOW - 5 * 60 * 60 * 1000 }); // 5h ago
    const [ranked] = rankArticles([article], [source]);
    expect(ranked.score).toBe(0 + 3 + 1); // no keywords + recency3 + priority1
  });

  it('assigns recency +2 for articles 6–24h old', () => {
    const article = makeArticle({ publishedAt: NOW - 12 * 60 * 60 * 1000 });
    const [ranked] = rankArticles([article], [source]);
    expect(ranked.score).toBe(0 + 2 + 1);
  });

  it('assigns recency +1 for articles 24–48h old', () => {
    const article = makeArticle({ publishedAt: NOW - 36 * 60 * 60 * 1000 });
    const [ranked] = rankArticles([article], [source]);
    expect(ranked.score).toBe(0 + 1 + 1);
  });

  it('assigns recency +0 for articles older than 48h', () => {
    const article = makeArticle({ publishedAt: NOW - 72 * 60 * 60 * 1000 });
    const [ranked] = rankArticles([article], [source]);
    expect(ranked.score).toBe(0 + 0 + 1);
  });

  it('uses sourcePriority from FeedSource', () => {
    const highPriority: FeedSource = { ...source, priority: 5 };
    const article = makeArticle({ publishedAt: NOW - 72 * 60 * 60 * 1000 }); // recency=0, no keywords
    const [ranked] = rankArticles([article], [highPriority]);
    expect(ranked.score).toBe(5);
  });

  it('is deterministic — same input produces same output', () => {
    const articles = [
      makeArticle({ id: '1', title: 'Chile economy AI' }),
      makeArticle({ id: '2', title: 'Sports results' }),
      makeArticle({ id: '3', title: 'Frontend regulation' }),
    ];
    const r1 = rankArticles([...articles], [source]);
    const r2 = rankArticles([...articles], [source]);
    expect(r1.map((a) => a.id)).toEqual(r2.map((a) => a.id));
  });

  it('does not mutate the original articles array', () => {
    const articles = [makeArticle({ id: '1' }), makeArticle({ id: '2' })];
    const copy = articles.map((a) => ({ ...a }));
    rankArticles(articles, [source]);
    expect(articles[0].score).toBe(copy[0].score);
  });

  it('falls back to priority=1 for unknown source', () => {
    const article = makeArticle({ source: 'Unknown Source', publishedAt: NOW - 72 * 60 * 60 * 1000 });
    const [ranked] = rankArticles([article], [source]);
    expect(ranked.score).toBe(1); // fallback priority
  });
});
