import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateFeed, buildFeedSource } from './feedValidator';

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Blog</title>
    <link>https://testblog.com</link>
    <item><title>Post 1</title><link>https://testblog.com/1</link></item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Blog</title>
  <entry>
    <title>Entry 1</title>
    <link href="https://atomblog.com/1"/>
  </entry>
</feed>`;

const HTML_WITH_FEED = `<!DOCTYPE html>
<html>
  <head>
    <link rel="alternate" type="application/rss+xml" title="Blog Feed" href="/feed.xml">
  </head>
  <body><h1>A website</h1></body>
</html>`;

function mockResponse(body: string, ok = true) {
  return { ok, status: ok ? 200 : 500, text: () => Promise.resolve(body) };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('validateFeed', () => {
  it('accepts a direct RSS feed URL', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(RSS) as Response);
    const result = await validateFeed('https://testblog.com/feed');
    expect(result.url).toBe('https://testblog.com/feed');
    expect(result.name).toBe('Test Blog');
  });

  it('accepts a direct Atom feed URL', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(ATOM) as Response);
    const result = await validateFeed('https://atomblog.com/feed');
    expect(result.name).toBe('Atom Blog');
  });

  it('discovers feed from HTML page with <link rel="alternate">', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(mockResponse(HTML_WITH_FEED) as Response) // HTML page
      .mockResolvedValueOnce(mockResponse(RSS) as Response);            // discovered feed
    const result = await validateFeed('https://testblog.com');
    expect(result.url).toBe('https://testblog.com/feed.xml');
    expect(result.name).toBe('Test Blog');
  });

  it('prepends https:// when scheme is missing', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse(RSS) as Response);
    const result = await validateFeed('testblog.com/feed');
    expect(result.url).toMatch(/^https:\/\//);
  });

  it('throws when URL returns neither feed nor HTML with feed links', async () => {
    vi.mocked(fetch).mockResolvedValue(mockResponse('<html><body>No feed</body></html>') as Response);
    await expect(validateFeed('https://nofeed.com')).rejects.toThrow('No RSS/Atom feed found');
  });

  it('throws when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
    await expect(validateFeed('https://broken.com/feed')).rejects.toThrow();
  });
});

describe('buildFeedSource', () => {
  it('builds a FeedSource with defaults', () => {
    const feed = buildFeedSource({ url: 'https://testblog.com/feed', name: 'Test Blog' });
    expect(feed.id).toBe('https://testblog.com/feed');
    expect(feed.name).toBe('Test Blog');
    expect(feed.categoryId).toBe('custom');
    expect(feed.active).toBe(true);
    expect(feed.priority).toBe(1);
  });

  it('applies custom category and priority', () => {
    const feed = buildFeedSource(
      { url: 'https://testblog.com/feed', name: 'Test Blog' },
      'tech',
      3,
    );
    expect(feed.categoryId).toBe('tech');
    expect(feed.priority).toBe(3);
  });
});
