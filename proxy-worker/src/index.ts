/**
 * Daily Brief — Worker
 *
 * Serves two purposes:
 *   1. CORS Proxy  — GET /?url=<rss-feed-url>   (original, unchanged)
 *   2. Feed Sync   — POST /feeds/sync            (Phase 1: sync PWA feed list to D1)
 *   3. Digest      — GET /digest                 (Phase 3: serve pre-built AI digest)
 *
 * Scheduled jobs (cron):
 *   every 30 min   — RSS ingestion pipeline
 *   daily at 06:00 — Daily digest build
 */
import type { WorkerEnv } from './types';
import { handleScheduled } from './handlers/cron';
import { handleFeedSync } from './handlers/feedSync';

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const allowedOrigin = env.ALLOWED_ORIGIN ?? '*';

    // CORS preflight — applies to all routes
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin),
      });
    }

    // ── Route: POST /feeds/sync ─────────────────────────────────────────────
    if (url.pathname === '/feeds/sync') {
      return handleFeedSync(request, env, allowedOrigin);
    }

    // ── Route: GET /digest ──────────────────────────────────────────────────
    // Phase 3 — placeholder returns empty digest so the PWA can test integration
    if (url.pathname === '/digest' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ generatedAt: Date.now(), date: todayISO(), clusters: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(allowedOrigin) },
        },
      );
    }

    // ── Route: GET /?url=  (CORS proxy — original, unchanged) ──────────────
    if (request.method !== 'GET') {
      return errorResponse('Method not allowed', 405, allowedOrigin);
    }

    // Enforce origin allowlist
    if (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*') {
      const origin = request.headers.get('Origin') ?? '';
      const allowed = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim());
      if (origin && !allowed.includes(origin)) {
        return errorResponse('Forbidden origin', 403, allowedOrigin);
      }
    }

    // Auth key check
    if (env.AUTH_KEY) {
      const key =
        request.headers.get('X-Proxy-Key') ??
        url.searchParams.get('key');
      if (key !== env.AUTH_KEY) {
        return errorResponse('Unauthorized', 401, allowedOrigin);
      }
    }

    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return errorResponse('Missing ?url= parameter', 400, allowedOrigin);
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return errorResponse('Invalid URL', 400, allowedOrigin);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return errorResponse('Only http/https URLs allowed', 400, allowedOrigin);
    }

    if (isBlockedHost(parsed)) {
      return errorResponse('Target host not allowed', 403, allowedOrigin);
    }

    // CF cache
    const cacheKey = new Request(targetUrl, { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set('X-Proxy-Cache', 'HIT');
      return addCors(resp, allowedOrigin);
    }

    let upstream: Response;
    try {
      upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DailyBriefBot/1.0; +https://github.com/daily-brief)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        redirect: 'follow',
      });
    } catch (err) {
      return errorResponse(`Upstream fetch failed: ${(err as Error).message}`, 502, allowedOrigin);
    }

    if (!upstream.ok) {
      return errorResponse(`Upstream returned HTTP ${upstream.status}`, 502, allowedOrigin);
    }

    const body = await upstream.text();
    const contentType = upstream.headers.get('Content-Type') ?? 'application/xml; charset=utf-8';

    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=300`,
        'X-Proxy-Cache': 'MISS',
        ...corsHeaders(allowedOrigin),
      },
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },

  // ── Scheduled handler ─────────────────────────────────────────────────────
  async scheduled(event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    return handleScheduled(event, env, ctx);
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Proxy-Key',
    'Vary': 'Origin',
  };
}

function addCors(response: Response, allowedOrigin: string): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders(allowedOrigin)).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}

function errorResponse(message: string, status: number, allowedOrigin: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain', ...corsHeaders(allowedOrigin) },
  });
}

function isBlockedHost(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  if (h === 'metadata.google.internal') return true;
  if (h === '169.254.169.254') return true;
  if (h === 'localhost') return true;
  if (h === '::1') return true;
  const parts = h.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (h.startsWith('fc00:') || h.startsWith('fd') || h.startsWith('fe80:')) return true;
  return false;
}
