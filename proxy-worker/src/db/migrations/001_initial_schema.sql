-- Daily Brief Intelligence Pipeline — Initial Schema
-- Apply via: npx wrangler d1 execute daily-brief-db --file=src/db/migrations/001_initial_schema.sql

-- articles: one row per normalized, deduplicated article
CREATE TABLE IF NOT EXISTS articles (
  id           TEXT PRIMARY KEY,       -- guid/link, lowercased
  title        TEXT NOT NULL,
  link         TEXT NOT NULL,
  source       TEXT NOT NULL,          -- feed name
  feed_id      TEXT NOT NULL,
  published_at INTEGER NOT NULL,       -- epoch ms
  fetched_at   INTEGER NOT NULL,       -- epoch ms
  content      TEXT,                   -- full body when available
  -- Phase 2 fields (nullable until populated by the AI pipeline)
  embedding    TEXT,                   -- JSON float array (bge-small-en-v1.5, 384 dims)
  topics       TEXT,                   -- JSON string array, e.g. ["AI","Tech"]
  region       TEXT,                   -- "Global" | "Chile" | "US" | ...
  importance   REAL,                   -- 0.0–1.0
  -- Phase 3 fields
  cluster_id   TEXT,
  is_duplicate INTEGER NOT NULL DEFAULT 0,  -- 1 if semantic duplicate of another article
  score        REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_articles_feed_id      ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_fetched_at   ON articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id   ON articles(cluster_id);

-- clusters: one row per semantic cluster of related articles
CREATE TABLE IF NOT EXISTS clusters (
  id           TEXT PRIMARY KEY,
  topic        TEXT,
  region       TEXT,
  article_ids  TEXT NOT NULL,          -- JSON array of article IDs
  article_hash TEXT,                   -- hash of sorted article_ids for change detection (Phase 4)
  -- Phase 4 fields (LLM-generated, nullable)
  headline     TEXT,
  insights     TEXT,                   -- JSON array of strings
  impact       TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clusters_updated_at ON clusters(updated_at DESC);

-- digests: one cached daily digest per day
CREATE TABLE IF NOT EXISTS digests (
  id           TEXT PRIMARY KEY,       -- YYYY-MM-DD
  generated_at INTEGER NOT NULL,
  payload      TEXT NOT NULL           -- JSON-serialized DigestResponse
);

-- feeds: canonical feed list, synced from the PWA via POST /feeds/sync
CREATE TABLE IF NOT EXISTS feeds (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  category_id  TEXT NOT NULL,
  active       INTEGER NOT NULL DEFAULT 1,
  priority     INTEGER NOT NULL DEFAULT 1
);
