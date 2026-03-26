import type { WorkerEnv, FeedRecord } from '../types';
import { upsertFeeds } from '../db/queries';

/**
 * POST /feeds/sync
 *
 * Accepts the PWA's current feed list and syncs it to D1 so the cron
 * ingestion pipeline knows which URLs to fetch.
 *
 * Request body: JSON array of FeedSyncItem[]
 * Auth: requires X-Proxy-Key header matching env.AUTH_KEY (if set)
 *
 * The PWA calls this endpoint after any feed management change
 * (add feed, remove feed, toggle feed active state).
 */

interface FeedSyncItem {
  id: string;
  name: string;
  url: string;
  categoryId: string;
  active: boolean;
  priority: number;
}

export async function handleFeedSync(
  request: Request,
  env: WorkerEnv,
  allowedOrigin: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonError('Method not allowed', 405, allowedOrigin);
  }

  // Auth gate — required if AUTH_KEY is configured
  if (env.AUTH_KEY) {
    const key = request.headers.get('X-Proxy-Key');
    if (key !== env.AUTH_KEY) {
      return jsonError('Unauthorized', 401, allowedOrigin);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400, allowedOrigin);
  }

  if (!Array.isArray(body)) {
    return jsonError('Body must be a JSON array', 400, allowedOrigin);
  }

  const feeds: FeedRecord[] = [];
  for (const item of body as FeedSyncItem[]) {
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.url !== 'string' ||
      typeof item.categoryId !== 'string'
    ) {
      return jsonError('Each feed must have id, name, url, categoryId', 400, allowedOrigin);
    }
    feeds.push({
      id: item.id,
      name: item.name,
      url: item.url,
      category_id: item.categoryId,
      active: item.active ? 1 : 0,
      priority: typeof item.priority === 'number' ? item.priority : 1,
    });
  }

  await upsertFeeds(env.DB, feeds);

  return new Response(JSON.stringify({ ok: true, synced: feeds.length }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(allowedOrigin),
    },
  });
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Key',
    'Vary': 'Origin',
  };
}

function jsonError(message: string, status: number, allowedOrigin: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
  });
}
