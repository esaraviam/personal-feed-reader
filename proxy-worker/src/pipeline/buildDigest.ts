/**
 * Daily digest builder.
 *
 * Orchestrates the full pipeline for one digest build cycle:
 *   1. Load classified articles from the past 48h
 *   2. Cluster them by embedding similarity (K-means)
 *   3. Rank clusters by aggregate importance score
 *   4. Persist clusters + article assignments to D1
 *   5. Cache the serialized DigestResponse in the digests table
 *   6. Return the DigestResponse
 *
 * Called by the daily 06:00 UTC cron and on-demand by GET /digest (cache miss).
 * Phase 4 will extend this by adding LLM summarization (headline, insights, impact).
 */
import type { WorkerEnv, DigestResponse, DigestCluster, DigestArticle } from '../types';
import { clusterArticles } from './cluster';
import type { ArticleForClustering } from './cluster';
import {
  getClassifiedArticles,
  saveClusters,
  assignArticleCluster,
  saveDigest,
} from '../db/queries';
import { DEDUP_WINDOW_MS } from './dedup';

export async function buildDailyDigest(env: WorkerEnv): Promise<DigestResponse> {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);

  // ── 1. Load candidates ────────────────────────────────────────────────────
  const rows = await getClassifiedArticles(env.DB, DEDUP_WINDOW_MS);

  if (rows.length === 0) {
    console.log('[digest] No classified articles found — returning empty digest.');
    const empty: DigestResponse = { generatedAt: now, date, clusters: [] };
    await saveDigest(env.DB, date, now, JSON.stringify(empty));
    return empty;
  }

  // ── 2. Parse stored JSON fields ───────────────────────────────────────────
  const articles: ArticleForClustering[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    link: r.link,
    source: r.source,
    embedding: JSON.parse(r.embedding) as number[],
    topics: JSON.parse(r.topics ?? '["General"]') as string[],
    region: r.region ?? 'Global',
    importance: r.importance ?? 0,
    publishedAt: r.published_at,
  }));

  // ── 3. Cluster ────────────────────────────────────────────────────────────
  const clusters = clusterArticles(articles);

  // ── 4. Persist clusters + article assignments ─────────────────────────────
  await saveClusters(
    env.DB,
    clusters.map((c) => ({
      id: c.id,
      topic: c.topic,
      region: c.region,
      articleIds: c.memberIds,
      createdAt: now,
      updatedAt: now,
    })),
  );

  for (const cluster of clusters) {
    await assignArticleCluster(env.DB, cluster.memberIds, cluster.id);
  }

  // ── 5. Build DigestResponse ───────────────────────────────────────────────
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const digestClusters: DigestCluster[] = clusters.map((c) => {
    const members = c.memberIds
      .map((id) => articleMap.get(id))
      .filter((a): a is ArticleForClustering => a !== undefined);

    // Already sorted by importance desc from clusterArticles; take top 5 for display
    const top = members.slice(0, 5);

    const digestArticles: DigestArticle[] = top.map((a) => ({
      id: a.id,
      title: a.title,
      link: a.link,
      source: a.source,
      publishedAt: a.publishedAt,
      score: a.importance,
    }));

    return {
      id: c.id,
      topic: c.topic,
      region: c.region,
      headline: null,  // Phase 4: LLM-generated
      insights: null,  // Phase 4
      impact: null,    // Phase 4
      articles: digestArticles,
      clusterSize: c.memberIds.length,
    };
  });

  const digest: DigestResponse = { generatedAt: now, date, clusters: digestClusters };

  // ── 6. Cache in D1 ───────────────────────────────────────────────────────
  await saveDigest(env.DB, date, now, JSON.stringify(digest));

  console.log(
    `[digest] Built digest for ${date}: ${clusters.length} clusters from ${articles.length} articles.`,
  );

  return digest;
}
