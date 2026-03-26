import { describe, it, expect } from 'vitest';
import { cosineSimilarity, isDuplicate, SIMILARITY_THRESHOLD, DEDUP_WINDOW_MS } from './dedup';

// ── cosineSimilarity ──────────────────────────────────────────────────────────

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
  });

  it('returns 0 for empty vectors', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it('computes correct similarity for non-trivial vectors', () => {
    // cos([3,4], [4,3]) = (12+12)/(5*5) = 24/25 = 0.96
    expect(cosineSimilarity([3, 4], [4, 3])).toBeCloseTo(24 / 25);
  });
});

// ── isDuplicate ───────────────────────────────────────────────────────────────

describe('isDuplicate', () => {
  const identicalToFirst = [1, 0, 0];
  const corpus = [
    [1, 0, 0],   // identical — sim = 1.0
    [0, 1, 0],   // orthogonal — sim = 0.0
  ];

  it('returns true when candidate matches a corpus vector above threshold', () => {
    expect(isDuplicate(identicalToFirst, corpus)).toBe(true);
  });

  it('returns false when candidate is below threshold for all corpus members', () => {
    const novel = [0, 0, 1]; // orthogonal to all corpus members
    expect(isDuplicate(novel, corpus)).toBe(false);
  });

  it('returns false for an empty corpus', () => {
    expect(isDuplicate([1, 0, 0], [])).toBe(false);
  });

  it('respects a custom threshold', () => {
    // sim([3,4],[4,3]) ≈ 0.96
    const a = [3, 4];
    const b = [4, 3];
    expect(isDuplicate(a, [b], 0.95)).toBe(true);  // 0.96 >= 0.95
    expect(isDuplicate(a, [b], 0.97)).toBe(false); // 0.96 < 0.97
  });

  it('uses SIMILARITY_THRESHOLD (0.90) as default', () => {
    // vectors that are slightly similar but not duplicates
    const a = [1, 0.5, 0];
    const b = [1, 0, 0];
    const sim = cosineSimilarity(a, b);
    const expected = sim >= SIMILARITY_THRESHOLD;
    expect(isDuplicate(a, [b])).toBe(expected);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('SIMILARITY_THRESHOLD is 0.90', () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.90);
  });

  it('DEDUP_WINDOW_MS is 48 hours', () => {
    expect(DEDUP_WINDOW_MS).toBe(48 * 60 * 60 * 1000);
  });
});
