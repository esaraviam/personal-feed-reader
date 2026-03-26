import { describe, it, expect } from 'vitest';
import {
  sqDist,
  vectorMean,
  plurality,
  initCentroids,
  clusterArticles,
} from './cluster';
import type { ArticleForClustering } from './cluster';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeArticle(overrides: Partial<ArticleForClustering> & { embedding: number[] }): ArticleForClustering {
  return {
    id: overrides.id ?? 'article-1',
    title: overrides.title ?? 'Test Article',
    link: overrides.link ?? 'https://example.com/1',
    source: overrides.source ?? 'Test Source',
    topics: overrides.topics ?? ['General'],
    region: overrides.region ?? 'Global',
    importance: overrides.importance ?? 0.5,
    publishedAt: overrides.publishedAt ?? Date.now(),
    embedding: overrides.embedding,
  };
}

// ── sqDist ────────────────────────────────────────────────────────────────────

describe('sqDist', () => {
  it('returns 0 for identical vectors', () => {
    expect(sqDist([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('computes correct squared distance', () => {
    // [0,0] → [3,4]: d=5, d²=25
    expect(sqDist([0, 0], [3, 4])).toBe(25);
  });

  it('is symmetric', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(sqDist(a, b)).toBe(sqDist(b, a));
  });
});

// ── vectorMean ────────────────────────────────────────────────────────────────

describe('vectorMean', () => {
  it('returns empty array for empty input', () => {
    expect(vectorMean([])).toEqual([]);
  });

  it('returns the vector itself for single input', () => {
    expect(vectorMean([[1, 2, 3]])).toEqual([1, 2, 3]);
  });

  it('computes the component-wise mean', () => {
    const result = vectorMean([[0, 0], [2, 4]]);
    expect(result[0]).toBeCloseTo(1);
    expect(result[1]).toBeCloseTo(2);
  });
});

// ── plurality ─────────────────────────────────────────────────────────────────

describe('plurality', () => {
  it('returns the most common value', () => {
    expect(plurality(['A', 'B', 'A', 'C', 'A'])).toBe('A');
  });

  it('returns first value on tie (first encountered wins)', () => {
    expect(plurality(['X', 'Y'])).toBe('X');
  });

  it('handles single element', () => {
    expect(plurality(['AI'])).toBe('AI');
  });
});

// ── initCentroids ─────────────────────────────────────────────────────────────

describe('initCentroids', () => {
  it('returns k centroids', () => {
    const embeddings = [[1, 0], [0, 1], [1, 1], [0, 0], [2, 2]];
    expect(initCentroids(embeddings, 3)).toHaveLength(3);
  });

  it('returns 1 centroid when k=1', () => {
    const embeddings = [[1, 0], [0, 1], [2, 2]];
    const result = initCentroids(embeddings, 1);
    expect(result).toHaveLength(1);
    expect(embeddings).toContainEqual(result[0]);
  });

  it('centroids are vectors from the input embeddings', () => {
    const embeddings = [[1, 0], [0, 1], [2, 2], [3, 3]];
    const centroids = initCentroids(embeddings, 2);
    for (const c of centroids) {
      expect(embeddings).toContainEqual(c);
    }
  });
});

// ── clusterArticles ───────────────────────────────────────────────────────────

describe('clusterArticles', () => {
  it('returns empty array for empty input', () => {
    expect(clusterArticles([])).toEqual([]);
  });

  it('returns single cluster for single article', () => {
    const article = makeArticle({ id: 'a1', embedding: [1, 0] });
    const result = clusterArticles([article]);
    expect(result).toHaveLength(1);
    expect(result[0].memberIds).toEqual(['a1']);
    expect(result[0].id).toBe('a1');
  });

  it('single cluster topic matches the article topic', () => {
    const article = makeArticle({
      id: 'a1',
      embedding: [1, 0],
      topics: ['Finance'],
      region: 'USA',
      importance: 0.7,
    });
    const [cluster] = clusterArticles([article]);
    expect(cluster.topic).toBe('Finance');
    expect(cluster.region).toBe('USA');
    expect(cluster.score).toBeCloseTo(0.7);
  });

  it('assigns all articles to some cluster (no articles dropped)', () => {
    const articles = Array.from({ length: 10 }, (_, i) =>
      makeArticle({
        id: `a${i}`,
        embedding: [Math.random(), Math.random()],
      }),
    );
    const clusters = clusterArticles(articles);
    const assignedIds = clusters.flatMap((c) => c.memberIds);
    expect(assignedIds).toHaveLength(10);
    for (const a of articles) {
      expect(assignedIds).toContain(a.id);
    }
  });

  it('clusters two clearly separated groups correctly', () => {
    // Group A: embeddings near [1, 0]
    // Group B: embeddings near [0, 1]  (orthogonal in 2D)
    const groupA = Array.from({ length: 5 }, (_, i) =>
      makeArticle({
        id: `a${i}`,
        embedding: [1 + i * 0.01, 0 + i * 0.005],
        topics: ['AI'],
        region: 'USA',
        importance: 0.6,
      }),
    );
    const groupB = Array.from({ length: 5 }, (_, i) =>
      makeArticle({
        id: `b${i}`,
        embedding: [0 + i * 0.005, 1 + i * 0.01],
        topics: ['Finance'],
        region: 'Europe',
        importance: 0.4,
      }),
    );

    const clusters = clusterArticles([...groupA, ...groupB]);

    // Should produce 2 clusters (10 articles / TARGET_CLUSTER_SIZE=5)
    expect(clusters).toHaveLength(2);

    // Each cluster should contain only articles from one group
    const idsA = new Set(groupA.map((a) => a.id));
    const idsB = new Set(groupB.map((a) => a.id));
    for (const cluster of clusters) {
      const memberSet = new Set(cluster.memberIds);
      const inA = [...memberSet].every((id) => idsA.has(id));
      const inB = [...memberSet].every((id) => idsB.has(id));
      expect(inA || inB).toBe(true);
    }
  });

  it('sorts clusters by score descending', () => {
    const articles = [
      makeArticle({ id: 'low',  embedding: [1, 0, 0], importance: 0.1 }),
      makeArticle({ id: 'high', embedding: [0, 1, 0], importance: 0.9 }),
      makeArticle({ id: 'mid',  embedding: [0, 0, 1], importance: 0.5 }),
    ];
    const clusters = clusterArticles(articles);
    for (let i = 0; i < clusters.length - 1; i++) {
      expect(clusters[i].score).toBeGreaterThanOrEqual(clusters[i + 1].score);
    }
  });

  it('prefers non-Global region in plurality vote', () => {
    const articles = [
      makeArticle({ id: 'a1', embedding: [1, 0], region: 'Global',  importance: 0.5 }),
      makeArticle({ id: 'a2', embedding: [1, 0], region: 'Chile',   importance: 0.6 }),
      makeArticle({ id: 'a3', embedding: [1, 0], region: 'Chile',   importance: 0.7 }),
    ];
    const [cluster] = clusterArticles(articles);
    expect(cluster.region).toBe('Chile');
  });

  it('cluster id equals the top-importance member id', () => {
    const articles = [
      makeArticle({ id: 'low',  embedding: [1, 0], importance: 0.2 }),
      makeArticle({ id: 'high', embedding: [1, 0], importance: 0.9 }),
    ];
    // With 2 articles, k = ceil(2/5) = 1 → single cluster
    const [cluster] = clusterArticles(articles);
    expect(cluster.id).toBe('high');
  });
});
