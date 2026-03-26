/**
 * Digest service — fetches the pre-built AI digest from the Cloudflare Worker.
 *
 * Caches the response in sessionStorage keyed by date (YYYY-MM-DD) so that
 * switching tabs does not trigger redundant network requests.
 *
 * Returns null when the Worker URL is not configured (local dev without Worker).
 */
import type { DigestResponse } from '../domain/digestTypes';

const WORKER_URL = (import.meta.env.VITE_PROXY_URL as string | undefined)?.replace(/\/$/, '');

function todayKey(): string {
  return `digest_${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Fetch today's digest.
 *
 * @throws if the network request fails (caller should handle and display error)
 * @returns null if no Worker URL is configured
 */
export async function fetchDigest(): Promise<DigestResponse | null> {
  if (!WORKER_URL) return null;

  // Serve from sessionStorage if we already fetched today
  const cacheKey = todayKey();
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached) as DigestResponse;
  }

  const res = await fetch(`${WORKER_URL}/digest`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Digest fetch failed: HTTP ${res.status}`);

  const data = (await res.json()) as DigestResponse;

  // Only cache non-empty digests — empty ones may become populated on retry
  if (data.clusters.length > 0) {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  }

  return data;
}

/** Clear cached digest for the current day (call after manual refresh). */
export function invalidateDigestCache(): void {
  sessionStorage.removeItem(todayKey());
}

export { WORKER_URL };
