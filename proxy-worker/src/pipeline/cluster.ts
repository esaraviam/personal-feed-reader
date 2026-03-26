/**
 * K-means clustering over article title embeddings.
 *
 * Groups semantically related articles together into digestible story clusters.
 * K is chosen dynamically: ceil(n / TARGET_CLUSTER_SIZE), clamped to [1, MAX_K].
 *
 * Uses K-means++ initialization for better centroid spread and faster convergence.
 * Runs for a fixed number of iterations (sufficient at personal-reader scale).
 */

const TARGET_CLUSTER_SIZE = 5; // target articles per cluster
const MAX_K = 15;
const MAX_ITERATIONS = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ArticleForClustering {
  id: string;
  title: string;
  link: string;
  source: string;
  embedding: number[];
  topics: string[];
  region: string;
  importance: number;
  publishedAt: number;
}

export interface Cluster {
  /** ID of the highest-importance article in the cluster (used as the cluster ID). */
  id: string;
  memberIds: string[];
  topic: string;
  region: string;
  /** Average importance of the top-5 members. */
  score: number;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

/** Squared Euclidean distance between two equal-length vectors. */
export function sqDist(a: number[], b: number[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += (a[i] - b[i]) ** 2;
  return d;
}

/** Component-wise mean of a set of vectors. */
export function vectorMean(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const result = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) result[i] += v[i];
  }
  return result.map((x) => x / vectors.length);
}

/** Plurality vote — most common value in an array. */
export function plurality(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] ?? 'General';
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

// ── K-means++ initialization ──────────────────────────────────────────────────

/**
 * K-means++ centroid initialization.
 * Spreads initial centroids to reduce the chance of degenerate clusters.
 */
export function initCentroids(embeddings: number[][], k: number): number[][] {
  const n = embeddings.length;
  const chosen: number[][] = [];

  // First centroid: uniform random
  chosen.push(embeddings[Math.floor(Math.random() * n)]);

  for (let c = 1; c < k; c++) {
    // D² distance to nearest chosen centroid
    const distances = embeddings.map((e) =>
      Math.min(...chosen.map((centroid) => sqDist(e, centroid))),
    );
    const total = distances.reduce((s, d) => s + d, 0);

    // Sample with probability ∝ D²
    let r = Math.random() * total;
    let nextIdx = 0;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        nextIdx = i;
        break;
      }
    }
    chosen.push(embeddings[nextIdx]);
  }

  return chosen;
}

// ── Clustering entry point ────────────────────────────────────────────────────

/**
 * Cluster articles by their embeddings using K-means.
 *
 * Returns clusters sorted by score descending (most important first).
 * Single-article input returns a single cluster without running K-means.
 */
export function clusterArticles(articles: ArticleForClustering[]): Cluster[] {
  if (articles.length === 0) return [];

  if (articles.length === 1) {
    const a = articles[0];
    return [
      {
        id: a.id,
        memberIds: [a.id],
        topic: a.topics[0] ?? 'General',
        region: a.region,
        score: a.importance,
      },
    ];
  }

  const k = Math.min(
    Math.max(1, Math.ceil(articles.length / TARGET_CLUSTER_SIZE)),
    MAX_K,
    articles.length,
  );

  const embeddings = articles.map((a) => a.embedding);
  let centroids = initCentroids(embeddings, k);
  let assignments = new Array<number>(articles.length).fill(0);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // ── Assignment step ────────────────────────────────────────────────────
    const newAssignments = embeddings.map((e) => {
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = sqDist(e, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      return best;
    });

    // ── Update step ────────────────────────────────────────────────────────
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c++) {
      const members = embeddings.filter((_, i) => newAssignments[i] === c);
      newCentroids.push(members.length > 0 ? vectorMean(members) : centroids[c]);
    }

    assignments = newAssignments;
    centroids = newCentroids;
  }

  // ── Build output clusters ─────────────────────────────────────────────────
  const clusterMap = new Map<number, ArticleForClustering[]>();
  for (let i = 0; i < articles.length; i++) {
    const c = assignments[i];
    if (!clusterMap.has(c)) clusterMap.set(c, []);
    clusterMap.get(c)!.push(articles[i]);
  }

  const clusters: Cluster[] = [];
  for (const members of clusterMap.values()) {
    if (members.length === 0) continue;

    // Sort by importance descending
    members.sort((a, b) => b.importance - a.importance);

    const top5 = members.slice(0, 5);
    const score = top5.reduce((s, a) => s + a.importance, 0) / top5.length;

    // Topic: plurality vote across all member topics
    const topicVotes = members.flatMap((a) => a.topics);
    const topic = plurality(topicVotes.length > 0 ? topicVotes : ['General']);

    // Region: prefer non-Global values in plurality vote
    const regionVotes = members.map((a) => a.region);
    const nonGlobal = regionVotes.filter((r) => r !== 'Global');
    const region = plurality(nonGlobal.length > 0 ? nonGlobal : regionVotes);

    clusters.push({
      id: members[0].id, // highest-importance article becomes cluster ID
      memberIds: members.map((a) => a.id),
      topic,
      region,
      score,
    });
  }

  return clusters.sort((a, b) => b.score - a.score);
}
