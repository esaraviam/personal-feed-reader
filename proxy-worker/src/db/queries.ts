import type { FeedRecord, NormalizedArticle } from '../types';

// ── Feeds ─────────────────────────────────────────────────────────────────────

export async function getActiveFeeds(db: D1Database): Promise<FeedRecord[]> {
  const result = await db
    .prepare('SELECT * FROM feeds WHERE active = 1')
    .all<FeedRecord>();
  return result.results;
}

/**
 * Upsert the full feed list from the PWA.
 * Uses batched D1 statements for efficiency.
 */
export async function upsertFeeds(db: D1Database, feeds: FeedRecord[]): Promise<void> {
  if (feeds.length === 0) return;
  const stmt = db.prepare(`
    INSERT INTO feeds (id, name, url, category_id, active, priority)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name        = excluded.name,
      url         = excluded.url,
      category_id = excluded.category_id,
      active      = excluded.active,
      priority    = excluded.priority
  `);
  await db.batch(
    feeds.map((f) => stmt.bind(f.id, f.name, f.url, f.category_id, f.active, f.priority)),
  );
}

// ── Articles ──────────────────────────────────────────────────────────────────

/**
 * Insert a new article. Skips silently if the ID already exists
 * (content-addressed by guid/link — same article fetched twice = no-op).
 */
export async function insertArticle(db: D1Database, article: NormalizedArticle): Promise<void> {
  await db
    .prepare(`
      INSERT INTO articles (id, title, link, source, feed_id, published_at, fetched_at, content)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(
      article.id,
      article.title,
      article.link,
      article.source,
      article.feedId,
      article.publishedAt,
      article.fetchedAt,
      article.content,
    )
    .run();
}

/**
 * Batch insert articles. Returns the count of rows actually written
 * (conflicts are silently skipped).
 */
export async function insertArticles(
  db: D1Database,
  articles: NormalizedArticle[],
): Promise<number> {
  if (articles.length === 0) return 0;
  const stmt = db.prepare(`
    INSERT INTO articles (id, title, link, source, feed_id, published_at, fetched_at, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);
  const results = await db.batch(
    articles.map((a) =>
      stmt.bind(a.id, a.title, a.link, a.source, a.feedId, a.publishedAt, a.fetchedAt, a.content),
    ),
  );
  return results.reduce((sum, r) => sum + (r.meta.changes ?? 0), 0);
}

/**
 * Retrieve recent non-duplicate articles within a time window.
 * Used by Phase 2 dedup to build the comparison corpus.
 */
export async function getRecentArticles(
  db: D1Database,
  windowMs: number,
): Promise<Array<{ id: string; title: string; embedding: string | null }>> {
  const cutoff = Date.now() - windowMs;
  const result = await db
    .prepare(`
      SELECT id, title, embedding
      FROM articles
      WHERE fetched_at >= ? AND is_duplicate = 0
      ORDER BY fetched_at DESC
    `)
    .bind(cutoff)
    .all<{ id: string; title: string; embedding: string | null }>();
  return result.results;
}

/**
 * Mark an article as a semantic duplicate of another.
 */
export async function markAsDuplicate(db: D1Database, articleId: string): Promise<void> {
  await db
    .prepare('UPDATE articles SET is_duplicate = 1 WHERE id = ?')
    .bind(articleId)
    .run();
}

/**
 * Write an embedding vector to an article record.
 * Embedding is stored as a JSON-serialized float array.
 */
export async function saveEmbedding(
  db: D1Database,
  articleId: string,
  embedding: number[],
): Promise<void> {
  await db
    .prepare('UPDATE articles SET embedding = ? WHERE id = ?')
    .bind(JSON.stringify(embedding), articleId)
    .run();
}

/**
 * Prune articles older than maxAgeMs that have not been assigned to a cluster.
 * Clustered articles are kept for digest history.
 */
export async function pruneOldArticles(db: D1Database, maxAgeMs: number): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const result = await db
    .prepare('DELETE FROM articles WHERE fetched_at < ? AND cluster_id IS NULL')
    .bind(cutoff)
    .run();
  return result.meta.changes ?? 0;
}
