import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeedSource } from '../domain/types';

const MOCK_ITEMS = [
  {
    title: 'Article One',
    link: 'https://example.com/1',
    guid: 'https://example.com/1',
    isoDate: '2026-03-23T10:00:00.000Z',
  },
  {
    title: 'Article Two',
    link: 'https://example.com/2',
    guid: 'https://example.com/2',
    isoDate: '2026-03-23T09:00:00.000Z',
  },
];

const mockParseURL = vi.fn().mockResolvedValue({ items: MOCK_ITEMS });

vi.mock('rss-parser', () => ({
  default: class MockParser {
    parseURL = mockParseURL;
  },
}));

// Import after mock is set up
const { aggregateFeeds } = await import('./aggregator');

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
    mockParseURL.mockReset();
    mockParseURL.mockResolvedValue({ items: MOCK_ITEMS });
  });

  it('returns articles from active feeds', async () => {
    const result = await aggregateFeeds([source]);
    expect(result.length).toBe(2);
    expect(result[0].source).toBe('Example');
    expect(result[0].category).toBe('tech');
  });

  it('skips inactive feeds', async () => {
    const inactiveSource: FeedSource = { ...source, active: false };
    const result = await aggregateFeeds([inactiveSource]);
    expect(result).toHaveLength(0);
    expect(mockParseURL).not.toHaveBeenCalled();
  });

  it('deduplicates articles with the same id across feeds', async () => {
    const source2: FeedSource = { ...source, id: 'https://mirror.com/rss', name: 'Mirror' };
    const result = await aggregateFeeds([source, source2]);
    // Both feeds return the same articles — dedup should keep only 2 unique
    const ids = result.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(result).toHaveLength(2);
  });

  it('skips feed after failure (returns empty for that feed)', async () => {
    mockParseURL.mockRejectedValue(new Error('Network error'));
    const result = await aggregateFeeds([source]);
    expect(result).toHaveLength(0);
  });

  it('normalizes article fields correctly', async () => {
    const result = await aggregateFeeds([source]);
    const article = result[0];
    expect(typeof article.id).toBe('string');
    expect(typeof article.title).toBe('string');
    expect(typeof article.link).toBe('string');
    expect(typeof article.publishedAt).toBe('number');
    expect(article.score).toBe(0); // ranking engine assigns score, not aggregator
    expect(article.category).toBe('tech');
  });

  it('handles empty sources array', async () => {
    const result = await aggregateFeeds([]);
    expect(result).toHaveLength(0);
  });

  it('continues processing other feeds when one fails', async () => {
    const failingSource: FeedSource = { ...source, id: 'fail', url: 'https://fail.com/rss' };
    const workingSource: FeedSource = { ...source, id: 'ok', url: 'https://ok.com/rss' };

    mockParseURL
      .mockRejectedValueOnce(new Error('fail')) // first call (retry 1)
      .mockRejectedValueOnce(new Error('fail')) // first call (retry 2)
      .mockResolvedValueOnce({ items: MOCK_ITEMS }); // second source succeeds

    const result = await aggregateFeeds([failingSource, workingSource]);
    expect(result).toHaveLength(2);
  });
});
