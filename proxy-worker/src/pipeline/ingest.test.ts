import { describe, it, expect } from 'vitest';
import { normalizeItem, extractItems, extractLink, toText, parseDate } from './ingest';
import type { XmlNode } from './ingest';
import type { FeedRecord } from '../types';

const MOCK_FEED: FeedRecord = {
  id: 'feed-1',
  name: 'Test Feed',
  url: 'https://example.com/feed.xml',
  category_id: 'tech',
  active: 1,
  priority: 1,
};

const NOW = Date.now();

// ── toText ────────────────────────────────────────────────────────────────────

describe('toText', () => {
  it('returns string as-is', () => {
    expect(toText('hello')).toBe('hello');
  });
  it('converts number to string', () => {
    expect(toText(42)).toBe('42');
  });
  it('extracts #text from xml node object', () => {
    expect(toText({ '#text': 'extracted' })).toBe('extracted');
  });
  it('returns empty string for null', () => {
    expect(toText(null)).toBe('');
  });
  it('returns empty string for undefined', () => {
    expect(toText(undefined)).toBe('');
  });
});

// ── extractLink ───────────────────────────────────────────────────────────────

describe('extractLink', () => {
  it('returns plain string link', () => {
    expect(extractLink({ link: 'https://example.com/article' })).toBe('https://example.com/article');
  });
  it('returns href from atom link object', () => {
    expect(extractLink({ link: { '@_href': 'https://example.com/atom' } })).toBe('https://example.com/atom');
  });
  it('prefers rel=alternate in atom link array', () => {
    const item = {
      link: [
        { '@_rel': 'self', '@_href': 'https://example.com/self' },
        { '@_rel': 'alternate', '@_href': 'https://example.com/article' },
      ],
    };
    expect(extractLink(item)).toBe('https://example.com/article');
  });
  it('returns first href if no alternate', () => {
    const item = {
      link: [{ '@_rel': 'self', '@_href': 'https://example.com/only' }],
    };
    expect(extractLink(item)).toBe('https://example.com/only');
  });
  it('returns empty string if no link', () => {
    expect(extractLink({})).toBe('');
  });
});

// ── parseDate ─────────────────────────────────────────────────────────────────

describe('parseDate', () => {
  it('parses RFC 2822 date', () => {
    const ts = parseDate('Mon, 01 Jan 2024 12:00:00 GMT');
    expect(ts).toBe(Date.parse('Mon, 01 Jan 2024 12:00:00 GMT'));
  });
  it('parses ISO date', () => {
    const ts = parseDate('2024-06-15T10:30:00Z');
    expect(ts).toBe(Date.parse('2024-06-15T10:30:00Z'));
  });
  it('returns approx now for undefined', () => {
    const ts = parseDate(undefined);
    expect(ts).toBeGreaterThan(Date.now() - 1000);
  });
  it('returns approx now for invalid date string', () => {
    const ts = parseDate('not-a-date');
    expect(ts).toBeGreaterThan(Date.now() - 1000);
  });
});

// ── extractItems ──────────────────────────────────────────────────────────────

describe('extractItems', () => {
  it('extracts items from RSS 2.0 structure', () => {
    const doc: XmlNode = {
      rss: {
        channel: {
          item: [
            { title: 'Article 1', link: 'https://example.com/1', guid: '1' },
            { title: 'Article 2', link: 'https://example.com/2', guid: '2' },
          ],
        },
      },
    };
    expect(extractItems(doc)).toHaveLength(2);
  });

  it('extracts entries from Atom feed', () => {
    const doc: XmlNode = {
      feed: {
        entry: [
          { title: 'Entry 1', link: { '@_href': 'https://example.com/e1' }, id: 'e1' },
        ],
      },
    };
    expect(extractItems(doc)).toHaveLength(1);
  });

  it('returns empty array for unknown structure', () => {
    expect(extractItems({ unknown: {} })).toHaveLength(0);
  });
});

// ── normalizeItem ─────────────────────────────────────────────────────────────

describe('normalizeItem', () => {
  it('normalizes a valid RSS item', () => {
    const item: XmlNode = {
      title: 'Test Article',
      link: 'https://example.com/article',
      guid: 'https://example.com/article',
      pubDate: 'Mon, 01 Jan 2024 12:00:00 GMT',
      description: 'Article summary text',
    };
    const result = normalizeItem(item, MOCK_FEED, NOW);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Test Article');
    expect(result!.link).toBe('https://example.com/article');
    expect(result!.id).toBe('https://example.com/article');
    expect(result!.source).toBe('Test Feed');
    expect(result!.feedId).toBe('feed-1');
    expect(result!.content).toBe('Article summary text');
    expect(result!.fetchedAt).toBe(NOW);
  });

  it('returns null when title is missing', () => {
    const item: XmlNode = { link: 'https://example.com/article' };
    expect(normalizeItem(item, MOCK_FEED, NOW)).toBeNull();
  });

  it('returns null when link is missing', () => {
    const item: XmlNode = { title: 'No Link Article' };
    expect(normalizeItem(item, MOCK_FEED, NOW)).toBeNull();
  });

  it('lowercases the article id', () => {
    const item: XmlNode = {
      title: 'Article',
      link: 'https://example.com/A',
      guid: 'UPPERCASE-GUID-123',
    };
    const result = normalizeItem(item, MOCK_FEED, NOW);
    expect(result!.id).toBe('uppercase-guid-123');
  });

  it('uses link as id fallback when guid is missing', () => {
    const item: XmlNode = {
      title: 'Article',
      link: 'https://example.com/article',
    };
    const result = normalizeItem(item, MOCK_FEED, NOW);
    expect(result!.id).toBe('https://example.com/article');
  });

  it('caps content at 2000 chars', () => {
    const item: XmlNode = {
      title: 'Article',
      link: 'https://example.com/a',
      description: 'x'.repeat(3000),
    };
    const result = normalizeItem(item, MOCK_FEED, NOW);
    expect(result!.content!.length).toBe(2000);
  });

  it('prefers content:encoded over description', () => {
    const item: XmlNode = {
      title: 'Article',
      link: 'https://example.com/a',
      description: 'short',
      'content:encoded': 'full content',
    };
    const result = normalizeItem(item, MOCK_FEED, NOW);
    expect(result!.content).toBe('full content');
  });
});
