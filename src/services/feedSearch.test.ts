import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchFeeds } from './feedSearch';

const MOCK_FEEDLY = {
  results: [
    {
      feedId: 'feed/https://techcrunch.com/feed/',
      title: 'TechCrunch',
      description: 'Startup and Technology News',
      iconUrl: 'https://techcrunch.com/favicon.ico',
      website: 'https://techcrunch.com',
      subscribers: 1320958,
    },
    {
      feedId: 'feed/https://techcrunch.com/crunchbase/feed/',
      title: 'TechCrunch Crunchbase',
      description: '',
      website: null,
      subscribers: 5000,
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchFeeds', () => {
  it('returns mapped results from Feedly', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(MOCK_FEEDLY)),
    } as Response);

    const results = await searchFeeds('techcrunch');
    expect(results.length).toBe(2);
    expect(results[0].url).toBe('https://techcrunch.com/feed/');
    expect(results[0].title).toBe('TechCrunch');
    expect(results[0].subscribers).toBe(1320958);
  });

  it('strips the "feed/" prefix from feedId', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(MOCK_FEEDLY)),
    } as Response);

    const results = await searchFeeds('techcrunch');
    expect(results[0].url).not.toMatch(/^feed\//);
  });

  it('returns empty array for blank query without fetching', async () => {
    const results = await searchFeeds('   ');
    expect(results).toHaveLength(0);
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('filters out results with no feedId', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ results: [{ title: 'No URL' }] })),
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

  it('throws on invalid JSON', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('not json'),
    } as Response);

    await expect(searchFeeds('query')).rejects.toThrow('Invalid response');
  });

  it('returns empty array when results field is missing', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    } as Response);

    const results = await searchFeeds('query');
    expect(results).toHaveLength(0);
  });
});
