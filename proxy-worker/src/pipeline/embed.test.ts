import { describe, it, expect, vi } from 'vitest';
import { generateEmbeddings, generateEmbedding } from './embed';
import type { WorkerEnv } from '../types';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeEnv(data: number[][]): WorkerEnv {
  return {
    AI: {
      run: vi.fn().mockResolvedValue({ data }),
    },
  } as unknown as WorkerEnv;
}

// ── generateEmbeddings ────────────────────────────────────────────────────────

describe('generateEmbeddings', () => {
  it('returns empty array for empty input', async () => {
    const env = makeEnv([]);
    const result = await generateEmbeddings(env, []);
    expect(result).toEqual([]);
    expect(env.AI.run).not.toHaveBeenCalled();
  });

  it('returns one embedding per input text', async () => {
    const vectors = [[0.1, 0.2], [0.3, 0.4]];
    const env = makeEnv(vectors);
    const result = await generateEmbeddings(env, ['first', 'second']);
    expect(result).toEqual(vectors);
  });

  it('calls AI.run with the correct model and text array', async () => {
    const env = makeEnv([[1, 0]]);
    await generateEmbeddings(env, ['hello']);
    expect(env.AI.run).toHaveBeenCalledWith(
      '@cf/baai/bge-small-en-v1.5',
      { text: ['hello'] },
    );
  });

  it('throws when AI response has unexpected shape', async () => {
    const env = {
      AI: { run: vi.fn().mockResolvedValue({ unexpected: true }) },
    } as unknown as WorkerEnv;
    await expect(generateEmbeddings(env, ['text'])).rejects.toThrow('[embed]');
  });

  it('throws when AI response is null', async () => {
    const env = {
      AI: { run: vi.fn().mockResolvedValue(null) },
    } as unknown as WorkerEnv;
    await expect(generateEmbeddings(env, ['text'])).rejects.toThrow('[embed]');
  });
});

// ── generateEmbedding (single) ────────────────────────────────────────────────

describe('generateEmbedding', () => {
  it('returns the single embedding vector', async () => {
    const vector = [0.5, 0.6, 0.7];
    const env = makeEnv([vector]);
    const result = await generateEmbedding(env, 'hello');
    expect(result).toEqual(vector);
  });

  it('throws when result array is empty', async () => {
    // generateEmbeddings returns [] only for empty input, but we're passing a non-empty text.
    // Simulate the AI returning an empty data array.
    const badEnv = {
      AI: { run: vi.fn().mockResolvedValue({ data: [] }) },
    } as unknown as WorkerEnv;
    await expect(generateEmbedding(badEnv, 'hello')).rejects.toThrow('[embed] No embedding');
  });
});
