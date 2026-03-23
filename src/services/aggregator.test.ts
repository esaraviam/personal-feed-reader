import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FeedSource } from '../domain/types';

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Article One</title>
      <link>https://example.com/1</link>
      <guid>https://example.com/1</guid>
      <pubDate>Mon, 23 Mar 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/2</link>
      <guid>https://example.com/2</guid>
      <pubDate>Mon, 23 Mar 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Feed</title>
  <entry>
    <title>Atom Article</title>
    <link href="https://example.com/atom-1"/>
    <id>https://example.com/atom-1</id>
    <published>2026-03-23T10:00:00Z</published>
  </entry>
</feed>`;

// allorigins /get returns JSON wrapper
const ALLORIGINS_RESPONSE = JSON.stringify({ contents: RSS_FIXTURE, status: { http_code: 200 } });

const source: FeedSource = {
  id: 'https://example.com/rss',
  name: 'Example',
  url: 'https://example.com/rss',
  category: 'tech',
  active: true,
  priority: 1,
};

describe('aggregateFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(JSON.parse(ALLORIGINS_RESPONSE)),
        text: () => Promise.resolve(RSS_FIXTURE),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns articles from active RSS feeds', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].source).toBe('Example');
    expect(result[0].category).toBe('tech');
  });

  it('parses Atom feeds via fallback proxy', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new Error('allorigins fail')) // primary fails
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(ATOM_FIXTURE),
        }),
    );
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('skips inactive feeds', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const inactiveSource: FeedSource = { ...source, active: false };
    const result = await aggregateFeeds([inactiveSource]);
    expect(result).toHaveLength(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('deduplicates articles with the same id across feeds', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const source2: FeedSource = { ...source, id: 'https://mirror.com/rss', name: 'Mirror' };
    const result = await aggregateFeeds([source, source2]);
    const ids = result.map((a) => a.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('skips feed when all proxies fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result).toHaveLength(0);
  });

  it('normalizes article fields correctly', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    const article = result[0];
    expect(typeof article.id).toBe('string');
    expect(typeof article.title).toBe('string');
    expect(typeof article.link).toBe('string');
    expect(typeof article.publishedAt).toBe('number');
    expect(article.score).toBe(0);
    expect(article.category).toBe('tech');
  });

  it('handles empty sources array', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([]);
    expect(result).toHaveLength(0);
  });

  it('continues processing other feeds when one fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new Error('fail')) // failing feed, proxy 1
        .mockRejectedValueOnce(new Error('fail')) // failing feed, proxy 2
        .mockResolvedValue({           // working feed succeeds
          ok: true,
          json: () => Promise.resolve(JSON.parse(ALLORIGINS_RESPONSE)),
          text: () => Promise.resolve(RSS_FIXTURE),
        }),
    );
    const { aggregateFeeds } = await import('./aggregator');
    const failSource: FeedSource = { ...source, id: 'fail', url: 'https://fail.com/rss' };
    const okSource: FeedSource = { ...source, id: 'ok', url: 'https://ok.com/rss' };
    const result = await aggregateFeeds([failSource, okSource]);
    expect(result.length).toBeGreaterThan(0);
  });
});
