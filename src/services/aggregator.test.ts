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

const source: FeedSource = {
  id: 'https://example.com/rss',
  name: 'Example',
  url: 'https://example.com/rss',
  category: 'tech',
  active: true,
  priority: 1,
};

function mockFetch(body: string, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    text: () => Promise.resolve(body),
  });
}

describe('aggregateFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch(RSS_FIXTURE));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns articles from active RSS feeds', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(2);
    expect(result[0].source).toBe('Example');
    expect(result[0].category).toBe('tech');
  });

  it('parses Atom feeds', async () => {
    vi.stubGlobal('fetch', mockFetch(ATOM_FIXTURE));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Atom Article');
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
    expect(result).toHaveLength(2);
  });

  it('skips feed after failure', async () => {
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
        .mockRejectedValueOnce(new Error('fail')) // failing feed attempt 1
        .mockRejectedValueOnce(new Error('fail')) // failing feed attempt 2 (retry)
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(RSS_FIXTURE) }),
    );
    const { aggregateFeeds } = await import('./aggregator');
    const failingSource: FeedSource = { ...source, id: 'fail', url: 'https://fail.com/rss' };
    const workingSource: FeedSource = { ...source, id: 'ok', url: 'https://ok.com/rss' };
    const result = await aggregateFeeds([failingSource, workingSource]);
    expect(result).toHaveLength(2);
  });
});
