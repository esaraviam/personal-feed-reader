/**
 * Semantic deduplication pipeline.
 *
 * Strategy: cosine similarity over title embeddings.
 * Two articles are duplicates if similarity >= THRESHOLD.
 *
 * To avoid O(n²) comparisons on every cycle, the comparison window
 * is limited to articles fetched in the last DEDUP_WINDOW_MS (48 hours).
 * New articles are compared against this corpus and marked as duplicates
 * if they match any existing non-duplicate article above the threshold.
 *
 * CPU safety: at personal-reader scale (~200–500 articles per 48h window),
 * the dot product operations complete well under the Worker 30s cron limit.
 */

export const SIMILARITY_THRESHOLD = 0.90;
const DEDUP_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

// ── Math helpers ──────────────────────────────────────────────────────────────

/**
 * Cosine similarity between two equal-length vectors.
 * Returns a value in [-1, 1]. Returns 0 for zero vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Returns true if the candidate embedding is semantically similar to
 * any embedding in the corpus (i.e., is a duplicate).
 */
export function isDuplicate(
  candidate: number[],
  corpus: number[][],
  threshold = SIMILARITY_THRESHOLD,
): boolean {
  for (const existing of corpus) {
    if (cosineSimilarity(candidate, existing) >= threshold) return true;
  }
  return false;
}

// ── Exported corpus window constant for use in queries ────────────────────────

export { DEDUP_WINDOW_MS };
