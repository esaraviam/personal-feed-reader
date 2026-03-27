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

// ── Feed sync ─────────────────────────────────────────────────────────────────

interface FeedSyncItem {
  id: string;
  name: string;
  url: string;
  categoryId: string;
  active: boolean;
  priority: number;
}

/**
 * Push the current feed list to the Worker's D1 database.
 * Fire-and-forget — failures are logged but never surface to the user.
 * Called after any feed mutation so the ingestion pipeline stays in sync.
 */
export async function syncFeedsToWorker(feeds: FeedSyncItem[]): Promise<void> {
  if (!WORKER_URL) return;
  try {
    const res = await fetch(`${WORKER_URL}/feeds/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feeds),
    });
    if (!res.ok) console.warn(`[digest] /feeds/sync returned HTTP ${res.status}`);
  } catch (err) {
    console.warn('[digest] /feeds/sync failed:', (err as Error).message);
  }
}

export { WORKER_URL };
