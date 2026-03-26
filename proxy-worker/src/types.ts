/**
 * WorkerEnv — the full Cloudflare Worker environment bindings.
 * This replaces the inline `Env` interface in index.ts.
 */
export interface WorkerEnv {
  /** Comma-separated allowed origins, e.g. "https://feeds.millamanque.cl" */
  ALLOWED_ORIGIN?: string;
  /** Optional shared secret; if set, all requests must supply it */
  AUTH_KEY?: string;
  /** D1 SQLite database — bound in wrangler.toml */
  DB: D1Database;
  /** Workers AI — bound in wrangler.toml */
  AI: Ai;
}

// ── Ingestion pipeline types ──────────────────────────────────────────────────

/** Article as produced by the ingestion pipeline (before AI enrichment). */
export interface NormalizedArticle {
  id: string;         // guid or link, lowercased
  title: string;
  link: string;
  source: string;     // feed name
  feedId: string;
  publishedAt: number; // epoch ms
  fetchedAt: number;   // epoch ms
  content: string | null;
}

/** Feed record as stored in D1. */
export interface FeedRecord {
  id: string;
  name: string;
  url: string;
  category_id: string;
  active: number;   // 0 | 1
  priority: number;
}

// ── Digest response types (contract with the PWA) ─────────────────────────────
// These will be extended in Phase 3 once the GET /digest endpoint is live.
// Defined here early so Phase 1 can reference them in type comments.

export interface DigestArticle {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number;
  score: number;
}

export interface DigestCluster {
  id: string;
  topic: string;
  region: string;
  headline: string | null;
  insights: string[] | null;
  impact: string | null;
  articles: DigestArticle[];
  clusterSize: number;
}

export interface DigestResponse {
  generatedAt: number;
  date: string; // YYYY-MM-DD
  clusters: DigestCluster[];
}
