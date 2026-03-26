import { describe, it, expect, vi } from 'vitest';
import { insertArticles, pruneOldArticles, upsertFeeds, getActiveFeeds } from './queries';
import type { NormalizedArticle, FeedRecord } from '../types';

// ── Mock D1Database ───────────────────────────────────────────────────────────

function makeD1Mock() {
  const rows: Record<string, unknown>[] = [];

  const stmt = {
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    all: vi.fn().mockResolvedValue({ results: rows }),
  };

  return {
    prepare: vi.fn().mockReturnValue(stmt),
    batch: vi.fn().mockResolvedValue(
      Array.from({ length: 1 }, () => ({ meta: { changes: 1 } })),
    ),
    _stmt: stmt,
    _rows: rows,
  };
}

const MOCK_ARTICLE: NormalizedArticle = {
  id: 'article-1',
  title: 'Test Article',
  link: 'https://example.com/1',
  source: 'Test Feed',
  feedId: 'feed-1',
  publishedAt: Date.now() - 1000,
  fetchedAt: Date.now(),
  content: 'Article content',
};

const MOCK_FEED: FeedRecord = {
  id: 'feed-1',
  name: 'Test Feed',
  url: 'https://example.com/feed.xml',
  category_id: 'tech',
  active: 1,
  priority: 1,
};

// ── insertArticles ────────────────────────────────────────────────────────────

describe('insertArticles', () => {
  it('returns 0 for empty input', async () => {
    const db = makeD1Mock() as unknown as D1Database;
    const count = await insertArticles(db, []);
    expect(count).toBe(0);
  });

  it('calls db.batch with one statement per article', async () => {
    const mock = makeD1Mock();
    mock.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 0 } }, // second article was a conflict/no-op
    ]);
    const db = mock as unknown as D1Database;
    const count = await insertArticles(db, [MOCK_ARTICLE, { ...MOCK_ARTICLE, id: 'article-2' }]);
    expect(mock.batch).toHaveBeenCalledOnce();
    expect(count).toBe(1); // only 1 change (second was ON CONFLICT DO NOTHING)
  });

  it('returns total inserted count from batch results', async () => {
    const mock = makeD1Mock();
    mock.batch.mockResolvedValueOnce([
      { meta: { changes: 1 } },
      { meta: { changes: 1 } },
      { meta: { changes: 1 } },
    ]);
    const db = mock as unknown as D1Database;
    const count = await insertArticles(db, [
      MOCK_ARTICLE,
      { ...MOCK_ARTICLE, id: 'a2' },
      { ...MOCK_ARTICLE, id: 'a3' },
    ]);
    expect(count).toBe(3);
  });
});

// ── pruneOldArticles ──────────────────────────────────────────────────────────

describe('pruneOldArticles', () => {
  it('calls DELETE with the correct cutoff timestamp', async () => {
    const mock = makeD1Mock();
    mock._stmt.run.mockResolvedValueOnce({ meta: { changes: 5 } });
    const db = mock as unknown as D1Database;

    const before = Date.now();
    const count = await pruneOldArticles(db, 7 * 24 * 60 * 60 * 1000);
    const after = Date.now();

    expect(mock.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM articles'));
    const cutoffArg = mock._stmt.bind.mock.calls[0][0] as number;
    expect(cutoffArg).toBeGreaterThanOrEqual(before - 7 * 24 * 60 * 60 * 1000 - 50);
    expect(cutoffArg).toBeLessThanOrEqual(after - 7 * 24 * 60 * 60 * 1000 + 50);
    expect(count).toBe(5);
  });
});

// ── upsertFeeds ───────────────────────────────────────────────────────────────

describe('upsertFeeds', () => {
  it('does nothing for empty array', async () => {
    const mock = makeD1Mock();
    const db = mock as unknown as D1Database;
    await upsertFeeds(db, []);
    expect(mock.batch).not.toHaveBeenCalled();
  });

  it('calls db.batch once for multiple feeds', async () => {
    const mock = makeD1Mock();
    mock.batch.mockResolvedValueOnce([{ meta: { changes: 1 } }, { meta: { changes: 1 } }]);
    const db = mock as unknown as D1Database;
    await upsertFeeds(db, [MOCK_FEED, { ...MOCK_FEED, id: 'feed-2' }]);
    expect(mock.batch).toHaveBeenCalledOnce();
  });
});

// ── getActiveFeeds ────────────────────────────────────────────────────────────

describe('getActiveFeeds', () => {
  it('returns results from D1', async () => {
    const mock = makeD1Mock();
    mock._stmt.all.mockResolvedValueOnce({ results: [MOCK_FEED] });
    const db = mock as unknown as D1Database;
    const feeds = await getActiveFeeds(db);
    expect(feeds).toHaveLength(1);
    expect(feeds[0].id).toBe('feed-1');
  });

  it('queries only active feeds', async () => {
    const mock = makeD1Mock();
    const db = mock as unknown as D1Database;
    await getActiveFeeds(db);
    expect(mock.prepare).toHaveBeenCalledWith(expect.stringContaining('active = 1'));
  });
});
