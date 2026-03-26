/**
 * Digest API response types — PWA side.
 * These mirror the shapes defined in proxy-worker/src/types.ts.
 */

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
  /** LLM-generated headline (null until Phase 4 LLM runs). */
  headline: string | null;
  /** LLM-generated bullet insights (null until Phase 4 LLM runs). */
  insights: string[] | null;
  /** LLM-generated impact note (null until Phase 4 LLM runs). */
  impact: string | null;
  articles: DigestArticle[];
  clusterSize: number;
}

export interface DigestResponse {
  generatedAt: number;
  date: string; // YYYY-MM-DD
  clusters: DigestCluster[];
}
