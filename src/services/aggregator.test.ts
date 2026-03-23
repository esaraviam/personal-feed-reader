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
      <title>Article Two &amp; More</title>
      <link>https://example.com/2</link>
      <guid>https://example.com/2</guid>
      <pubDate>Mon, 23 Mar 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

const BOM_RSS = `\ufeff<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>BOM Feed Article</title>
      <link>https://example.com/bom-1</link>
      <guid>https://example.com/bom-1</guid>
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

const RDF_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns="http://purl.org/rss/1.0/">
  <item rdf:about="https://example.com/rdf-1">
    <title>RDF Article</title>
    <link>https://example.com/rdf-1</link>
  </item>
</rdf:RDF>`;

const source: FeedSource = {
  id: 'https://example.com/rss',
  name: 'Example',
  url: 'https://example.com/rss',
  category: 'tech',
  active: true,
  priority: 1,
};

const ALLORIGINS_OK = (xml: string) =>
  JSON.stringify({ contents: xml, status: { http_code: 200 } });

function mockFetchJson(xml: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(ALLORIGINS_OK(xml))),
    text: () => Promise.resolve(xml),
  });
}

describe('aggregateFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetchJson(RSS_FIXTURE));
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

  it('decodes XML entities in titles', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    const article = result.find((a) => a.link === 'https://example.com/2');
    expect(article?.title).toContain('&');
  });

  it('handles feeds with UTF-8 BOM prefix', async () => {
    vi.stubGlobal('fetch', mockFetchJson(BOM_RSS));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('BOM Feed Article');
  });

  it('parses Atom feeds', async () => {
    vi.stubGlobal('fetch', mockFetchJson(ATOM_FIXTURE));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Atom Article');
  });

  it('parses RSS 1.0 / RDF feeds', async () => {
    vi.stubGlobal('fetch', mockFetchJson(RDF_FIXTURE));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('RDF Article');
  });

  it('falls back to second proxy on primary failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockRejectedValueOnce(new Error('allorigins/get fail'))
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(ALLORIGINS_OK(RSS_FIXTURE))),
          text: () => Promise.resolve(RSS_FIXTURE),
        }),
    );
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('skips inactive feeds', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const inactive: FeedSource = { ...source, active: false };
    const result = await aggregateFeeds([inactive]);
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

  it('returns empty when all proxies fail for a feed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    expect(result).toHaveLength(0);
  });

  it('continues processing other feeds when one fails', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        call++;
        // First 3 calls (3 proxies for failing feed) all fail
        if (call <= 3) return Promise.reject(new Error('fail'));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(JSON.parse(ALLORIGINS_OK(RSS_FIXTURE))),
          text: () => Promise.resolve(RSS_FIXTURE),
        });
      }),
    );
    const { aggregateFeeds } = await import('./aggregator');
    const failSource: FeedSource = { ...source, id: 'fail', url: 'https://fail.com/rss' };
    const okSource: FeedSource = { ...source, id: 'ok', url: 'https://ok.com/rss' };
    const result = await aggregateFeeds([failSource, okSource]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('normalizes article fields correctly', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([source]);
    const a = result[0];
    expect(typeof a.id).toBe('string');
    expect(typeof a.title).toBe('string');
    expect(typeof a.link).toBe('string');
    expect(typeof a.publishedAt).toBe('number');
    expect(a.score).toBe(0);
  });

  it('handles empty sources array', async () => {
    const { aggregateFeeds } = await import('./aggregator');
    const result = await aggregateFeeds([]);
    expect(result).toHaveLength(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
