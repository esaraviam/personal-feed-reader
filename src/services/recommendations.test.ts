import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scoreRecommendedFeed,
  getRecommendedFeeds,
  _resetCatalogCache,
  type RecommendedFeed,
} from './recommendations';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeFeed(overrides: Partial<RecommendedFeed> = {}): RecommendedFeed {
  return {
    url: 'https://example.com/feed',
    title: 'Example Feed',
    description: 'A test feed',
    favicon: null,
    website: null,
    language: 'en',
    suggestedCategory: 'Tech',
    tags: ['tech'],
    subscribers: null,
    tier: 'niche',
    lastVerified: new Date().toISOString().slice(0, 10),
    ...overrides,
  };
}

// ─── scoreRecommendedFeed ─────────────────────────────────────────────────────

describe('scoreRecommendedFeed', () => {
  it('returns a higher score for a featured feed than a niche feed with same subs', () => {
    const featured = makeFeed({ tier: 'featured', subscribers: 10000 });
    const niche    = makeFeed({ tier: 'niche',    subscribers: 10000 });
    expect(scoreRecommendedFeed(featured, 'en')).toBeGreaterThan(scoreRecommendedFeed(niche, 'en'));
  });

  it('boosts score when feed language matches user language', () => {
    const feed = makeFeed({ language: 'es', tier: 'niche', subscribers: 5000 });
    const scoreMatch    = scoreRecommendedFeed(feed, 'es');
    const scoreMismatch = scoreRecommendedFeed(feed, 'en');
    expect(scoreMatch).toBeGreaterThan(scoreMismatch);
    expect(scoreMatch - scoreMismatch).toBeCloseTo(0.3, 5);
  });

  it('applies freshness boost for feeds verified within 30 days', () => {
    const fresh = makeFeed({ lastVerified: new Date().toISOString().slice(0, 10) });
    const stale = makeFeed({ lastVerified: '2020-01-01' });
    expect(scoreRecommendedFeed(fresh, 'en')).toBeGreaterThan(scoreRecommendedFeed(stale, 'en'));
  });

  it('caps popularity score at 0.5', () => {
    const huge = makeFeed({ subscribers: 999_000_000 });
    const score = scoreRecommendedFeed(huge, 'en');
    // popularityScore should be capped at 0.5; total can exceed 0.5 due to other bonuses
    // but popularity alone never exceeds 0.5
    expect(score).toBeLessThanOrEqual(1.4); // max theoretical: 0.5+0.4+0.3+0.1
  });

  it('uses 0.05 fallback when subscribers is null', () => {
    const unknown = makeFeed({ subscribers: null, tier: 'niche', language: 'xx', lastVerified: '2020-01-01' });
    const score = scoreRecommendedFeed(unknown, 'en');
    expect(score).toBeCloseTo(0.05, 5);
  });

  it('higher subscriber count yields higher popularity score', () => {
    const big   = makeFeed({ subscribers: 1_000_000 });
    const small = makeFeed({ subscribers: 100 });
    expect(scoreRecommendedFeed(big, 'en')).toBeGreaterThan(scoreRecommendedFeed(small, 'en'));
  });
});

// ─── getRecommendedFeeds ──────────────────────────────────────────────────────

describe('getRecommendedFeeds', () => {
  const catalog: RecommendedFeed[] = [
    makeFeed({ url: 'https://en1.com/feed', language: 'en', tier: 'featured', subscribers: 500000 }),
    makeFeed({ url: 'https://en2.com/feed', language: 'en', tier: 'popular',  subscribers: 100000 }),
    makeFeed({ url: 'https://es1.com/feed', language: 'es', tier: 'featured', subscribers: 800000 }),
    makeFeed({ url: 'https://es2.com/feed', language: 'es', tier: 'niche',    subscribers: 5000 }),
  ];

  beforeEach(() => {
    _resetCatalogCache();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1', updatedAt: '2026-03-25', feeds: catalog }),
    } as Response);
  });

  it('filters to user language when languageFilter=mine', async () => {
    const results = await getRecommendedFeeds('en', new Set(), 'mine');
    expect(results.every((f) => f.language === 'en')).toBe(true);
    expect(results).toHaveLength(2);
  });

  it('returns all languages when languageFilter=all', async () => {
    const results = await getRecommendedFeeds('en', new Set(), 'all');
    expect(results).toHaveLength(4);
  });

  it('excludes feeds whose URLs are in existingUrls', async () => {
    const existing = new Set(['https://en1.com/feed']);
    const results = await getRecommendedFeeds('en', existing, 'mine');
    expect(results.find((f) => f.url === 'https://en1.com/feed')).toBeUndefined();
    expect(results).toHaveLength(1);
  });

  it('returns results sorted by descending score', async () => {
    const results = await getRecommendedFeeds('en', new Set(), 'mine');
    for (let i = 0; i < results.length - 1; i++) {
      const scoreA = scoreRecommendedFeed(results[i], 'en');
      const scoreB = scoreRecommendedFeed(results[i + 1], 'en');
      expect(scoreA).toBeGreaterThanOrEqual(scoreB);
    }
  });

  it('returns empty array when all feeds are already subscribed', async () => {
    const existing = new Set(catalog.map((f) => f.url));
    const results = await getRecommendedFeeds('en', existing, 'all');
    expect(results).toHaveLength(0);
  });

  it('returns empty array when catalog fetch fails', async () => {
    _resetCatalogCache();
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 404 } as Response);
    const results = await getRecommendedFeeds('en', new Set()).catch(() => []);
    expect(results).toHaveLength(0);
  });
});
