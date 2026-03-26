/**
 * Embedding generation via Cloudflare Workers AI.
 * Model: @cf/baai/bge-small-en-v1.5  — 384-dimensional dense vectors.
 *
 * Called once per ingestion cycle for all new (unprocessed) articles.
 * Batches all titles into a single AI.run() call to minimize latency.
 */
import type { WorkerEnv } from '../types';

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5' as const;

/**
 * Generate embeddings for an array of text strings.
 * Returns a parallel array of float vectors (one per input string).
 * Returns an empty array if the input is empty.
 *
 * @throws if the AI binding call fails (caller should handle and log)
 */
export async function generateEmbeddings(
  env: WorkerEnv,
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Cast to unknown first — the generated Workers AI type for this model
  // doesn't expose `.data` but the runtime response shape is
  // { shape: number[], data: number[][] }.
  const result = (await env.AI.run(EMBEDDING_MODEL, { text: texts })) as unknown as {
    data?: number[][];
  };

  if (!result || !Array.isArray(result.data)) {
    throw new Error(`[embed] Unexpected AI response shape: ${JSON.stringify(result)}`);
  }

  return result.data;
}

/**
 * Generate a single embedding for one text string.
 * Convenience wrapper around generateEmbeddings.
 */
export async function generateEmbedding(
  env: WorkerEnv,
  text: string,
): Promise<number[]> {
  const results = await generateEmbeddings(env, [text]);
  if (results.length === 0) throw new Error('[embed] No embedding returned for single text');
  return results[0];
}
