/**
 * GET /digest handler.
 *
 * Returns the pre-built daily digest.
 * Cache strategy:
 *   - If today's digest exists in D1 and is < 12h old → serve from cache.
 *   - Otherwise → build a fresh digest, persist it, and return it.
 *
 * This keeps the response fast for the common case (cached) while ensuring
 * on-demand builds work correctly when the cron hasn't run yet or the data
 * has changed significantly.
 */
import type { WorkerEnv } from '../types';
import { getDigest } from '../db/queries';
import { buildDailyDigest } from '../pipeline/buildDigest';

const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Key',
    'Vary': 'Origin',
  };
}

export async function handleDigest(
  _request: Request,
  env: WorkerEnv,
  allowedOrigin: string,
): Promise<Response> {
  const now = Date.now();
  const date = new Date(now).toISOString().slice(0, 10);

  // ── Serve from cache if fresh ──────────────────────────────────────────────
  const cached = await getDigest(env.DB, date);
  if (cached && now - cached.generated_at < CACHE_MAX_AGE_MS) {
    return new Response(cached.payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Digest-Cache': 'HIT',
        ...corsHeaders(allowedOrigin),
      },
    });
  }

  // ── Build fresh digest ─────────────────────────────────────────────────────
  try {
    const digest = await buildDailyDigest(env);
    return new Response(JSON.stringify(digest), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Digest-Cache': 'MISS',
        ...corsHeaders(allowedOrigin),
      },
    });
  } catch (err) {
    console.error('[digest] Build failed:', err);
    return new Response(JSON.stringify({ error: 'Digest build failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
    });
  }
}
