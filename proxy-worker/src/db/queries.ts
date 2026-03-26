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
 * Retrieve articles that have been inserted but not yet processed
 * by the embedding + classification pipeline (embedding IS NULL).
 * Limited to the dedup window to keep the batch manageable.
 */
export async function getUnprocessedArticles(
  db: D1Database,
  windowMs: number,
): Promise<Array<{ id: string; title: string; source: string; feed_id: string; published_at: number }>> {
  const cutoff = Date.now() - windowMs;
  const result = await db
    .prepare(`
      SELECT id, title, source, feed_id, published_at
      FROM articles
      WHERE embedding IS NULL AND is_duplicate = 0 AND fetched_at >= ?
      ORDER BY fetched_at ASC
    `)
    .bind(cutoff)
    .all<{ id: string; title: string; source: string; feed_id: string; published_at: number }>();
  return result.results;
}

/**
 * Save classification results (topics, region, importance) for an article.
 * Topics are stored as a JSON array string.
 */
export async function saveClassification(
  db: D1Database,
  articleId: string,
  topics: string[],
  region: string,
  importance: number,
): Promise<void> {
  await db
    .prepare('UPDATE articles SET topics = ?, region = ?, importance = ? WHERE id = ?')
    .bind(JSON.stringify(topics), region, importance, articleId)
    .run();
}

// ── Phase 3: Clustering + Digest ──────────────────────────────────────────────

/**
 * Load all classified, non-duplicate articles within the dedup window.
 * These are the candidates for today's digest clustering pass.
 */
export async function getClassifiedArticles(
  db: D1Database,
  windowMs: number,
): Promise<Array<{
  id: string;
  title: string;
  link: string;
  source: string;
  published_at: number;
  embedding: string;
  topics: string | null;
  region: string | null;
  importance: number | null;
}>> {
  const cutoff = Date.now() - windowMs;
  const result = await db
    .prepare(`
      SELECT id, title, link, source, published_at, embedding, topics, region, importance
      FROM articles
      WHERE embedding IS NOT NULL
        AND is_duplicate = 0
        AND fetched_at >= ?
      ORDER BY importance DESC
    `)
    .bind(cutoff)
    .all<{
      id: string;
      title: string;
      link: string;
      source: string;
      published_at: number;
      embedding: string;
      topics: string | null;
      region: string | null;
      importance: number | null;
    }>();
  return result.results;
}

/**
 * Batch-upsert cluster records.
 */
export async function saveClusters(
  db: D1Database,
  clusters: Array<{
    id: string;
    topic: string;
    region: string;
    articleIds: string[];
    createdAt: number;
    updatedAt: number;
  }>,
): Promise<void> {
  if (clusters.length === 0) return;
  const stmt = db.prepare(`
    INSERT INTO clusters (id, topic, region, article_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      topic       = excluded.topic,
      region      = excluded.region,
      article_ids = excluded.article_ids,
      updated_at  = excluded.updated_at
  `);
  await db.batch(
    clusters.map((c) =>
      stmt.bind(c.id, c.topic, c.region, JSON.stringify(c.articleIds), c.createdAt, c.updatedAt),
    ),
  );
}

/**
 * Assign a list of articles to a cluster.
 */
export async function assignArticleCluster(
  db: D1Database,
  articleIds: string[],
  clusterId: string,
): Promise<void> {
  if (articleIds.length === 0) return;
  const stmt = db.prepare('UPDATE articles SET cluster_id = ?, score = importance WHERE id = ?');
  await db.batch(articleIds.map((id) => stmt.bind(clusterId, id)));
}

/**
 * Retrieve the cached digest for a given date (YYYY-MM-DD).
 * Returns null if no digest exists for that date.
 */
export async function getDigest(
  db: D1Database,
  date: string,
): Promise<{ generated_at: number; payload: string } | null> {
  const result = await db
    .prepare('SELECT generated_at, payload FROM digests WHERE id = ?')
    .bind(date)
    .first<{ generated_at: number; payload: string }>();
  return result ?? null;
}

/**
 * Upsert a daily digest payload.
 */
export async function saveDigest(
  db: D1Database,
  date: string,
  generatedAt: number,
  payload: string,
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO digests (id, generated_at, payload)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        generated_at = excluded.generated_at,
        payload      = excluded.payload
    `)
    .bind(date, generatedAt, payload)
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
