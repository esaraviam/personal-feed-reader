/**
 * Daily digest builder.
 *
 * Full pipeline for one digest build cycle:
 *   1. Load classified articles from the past 48h
 *   2. Cluster them by embedding similarity (K-means)
 *   3. Persist clusters + article assignments to D1
 *   4. LLM summarize each cluster (headline, insights, impact)
 *      — skips clusters whose article set hasn't changed (article_hash match)
 *   5. Cache the serialized DigestResponse in the digests table
 *   6. Return the DigestResponse
 *
 * Called by the daily 06:00 UTC cron and on-demand by GET /digest (cache miss).
 */
import type { WorkerEnv, DigestResponse, DigestCluster, DigestArticle } from '../types';
import { clusterArticles } from './cluster';
import type { ArticleForClustering, Cluster } from './cluster';
import { summarizeClusters } from './summarize';
import type { SummaryInput, ClusterSummary } from './summarize';
import {
  getClassifiedArticles,
  saveClusters,
  assignArticleCluster,
  saveDigest,
  getExistingClusters,
  updateClusterSummary,
} from '../db/queries';
import { DEDUP_WINDOW_MS } from './dedup';

// ── Hash helper ───────────────────────────────────────────────────────────────

/** Stable hash of a cluster's member IDs — used to detect unchanged clusters. */
function articleHash(ids: string[]): string {
  return [...ids].sort().join('|');
}

// ── Main builder ──────────────────────────────────────────────────────────────

export async function buildDailyDigest(env: WorkerEnv): Promise<DigestResponse> {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);

  // ── 1. Load candidates ────────────────────────────────────────────────────
  const rows = await getClassifiedArticles(env.DB, DEDUP_WINDOW_MS);

  if (rows.length === 0) {
    console.log('[digest] No classified articles — returning empty digest (not cached).');
    // Do NOT cache empty results — the next GET /digest should retry immediately
    // rather than serving a stale empty response for up to 12 hours.
    return { generatedAt: now, date, clusters: [] };
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

  // ── 5. LLM summarization (with hash-based skip) ───────────────────────────
  const summaries = await runSummarization(env, clusters, articles);
  const summaryMap = new Map(summaries.map((s) => [s.clusterId, s]));

  // Persist summaries back to D1
  for (const cluster of clusters) {
    const summary = summaryMap.get(cluster.id);
    if (summary) {
      await updateClusterSummary(
        env.DB,
        cluster.id,
        articleHash(cluster.memberIds),
        summary.headline,
        summary.insights,
        summary.impact,
      );
    }
  }

  // ── 6. Build DigestResponse ───────────────────────────────────────────────
  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const digestClusters: DigestCluster[] = clusters.map((c) => {
    const members = c.memberIds
      .map((id) => articleMap.get(id))
      .filter((a): a is ArticleForClustering => a !== undefined);

    // Sorted by importance desc from clusterArticles; take top 5 for display
    const top = members.slice(0, 5);

    const digestArticles: DigestArticle[] = top.map((a) => ({
      id: a.id,
      title: a.title,
      link: a.link,
      source: a.source,
      publishedAt: a.publishedAt,
      score: a.importance,
    }));

    const summary = summaryMap.get(c.id);
    return {
      id: c.id,
      topic: c.topic,
      region: c.region,
      headline: summary?.headline ?? null,
      insights: summary?.insights ?? null,
      impact: summary?.impact ?? null,
      articles: digestArticles,
      clusterSize: c.memberIds.length,
    };
  });

  const digest: DigestResponse = { generatedAt: now, date, clusters: digestClusters };

  // ── 7. Cache in D1 ────────────────────────────────────────────────────────
  await saveDigest(env.DB, date, now, JSON.stringify(digest));

  console.log(
    `[digest] Built digest for ${date}: ${clusters.length} clusters from ${articles.length} articles.`,
  );

  return digest;
}

// ── Summarization with hash-based cache ───────────────────────────────────────

/**
 * For each cluster, check if the article set has changed since the last digest.
 * Unchanged clusters reuse their stored LLM output; changed/new ones get a fresh call.
 */
async function runSummarization(
  env: WorkerEnv,
  clusters: Cluster[],
  articles: ArticleForClustering[],
): Promise<ClusterSummary[]> {
  if (clusters.length === 0) return [];

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  // Load existing cluster records to check hashes
  const existing = await getExistingClusters(env.DB, clusters.map((c) => c.id));
  const existingMap = new Map(existing.map((e) => [e.id, e]));

  const toSummarize: SummaryInput[] = [];
  const reused: ClusterSummary[] = [];

  for (const cluster of clusters) {
    const hash = articleHash(cluster.memberIds);
    const stored = existingMap.get(cluster.id);

    // Reuse if article set is unchanged and we have a stored headline
    if (stored?.article_hash === hash && stored.headline) {
      reused.push({
        clusterId: cluster.id,
        headline: stored.headline,
        insights: stored.insights ? (JSON.parse(stored.insights) as string[]) : null,
        impact: stored.impact,
      });
      continue;
    }

    // Build summarization input for changed/new clusters
    const members = cluster.memberIds
      .map((id) => articleMap.get(id))
      .filter((a): a is ArticleForClustering => a !== undefined);

    toSummarize.push({
      clusterId: cluster.id,
      topic: cluster.topic,
      region: cluster.region,
      articles: members.map((a) => ({ title: a.title, source: a.source })),
    });
  }

  if (reused.length > 0) {
    console.log(`[summarize] Reusing ${reused.length} unchanged cluster summaries.`);
  }

  const fresh = await summarizeClusters(env, toSummarize);
  return [...reused, ...fresh];
}
