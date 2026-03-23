import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchFeeds } from './feedSearch';

const MOCK_RESULTS = [
  {
    url: 'https://techcrunch.com/feed/',
    title: 'TechCrunch',
    description: 'Startup and Technology News',
    favicon: 'https://techcrunch.com/favicon.ico',
  },
  {
    url: 'https://techcrunch.com/crunchbase/feed/',
    title: 'TechCrunch Crunchbase',
    description: '',
    favicon: null,
  },
];

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchFeeds', () => {
  it('returns mapped results from feedsearch.dev', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(MOCK_RESULTS)),
    } as Response);

    const results = await searchFeeds('techcrunch');
    expect(results.length).toBe(2);
    expect(results[0].url).toBe('https://techcrunch.com/feed/');
    expect(results[0].title).toBe('TechCrunch');
    expect(results[0].description).toBe('Startup and Technology News');
  });

  it('returns empty array for blank query', async () => {
    const results = await searchFeeds('   ');
    expect(results).toHaveLength(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('filters out results with no URL', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ title: 'No URL result' }])),
    } as Response);

    const results = await searchFeeds('something');
    expect(results).toHaveLength(0);
  });

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve(''),
    } as Response);

    await expect(searchFeeds('query')).rejects.toThrow('HTTP 503');
  });

  it('throws on invalid JSON response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not json'),
    } as Response);

    await expect(searchFeeds('query')).rejects.toThrow('Invalid response');
  });

  it('uses feed_url field as fallback when url is missing', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify([{ feed_url: 'https://example.com/feed', title: 'Example' }]),
        ),
    } as Response);

    const results = await searchFeeds('example');
    expect(results[0].url).toBe('https://example.com/feed');
  });
});
