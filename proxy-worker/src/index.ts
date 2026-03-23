/**
 * Daily Brief — CORS Proxy Worker
 *
 * Fetches any URL on behalf of the browser and adds CORS headers.
 * Optional secret key to prevent public abuse.
 */

export interface Env {
  /** Optional: set in wrangler.toml [vars] or as a secret to restrict access */
  ALLOWED_ORIGIN?: string;
  AUTH_KEY?: string;
}

const CACHE_TTL = 300; // 5 minutes

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }), env);
    }

    if (request.method !== 'GET') {
      return corsResponse(new Response('Method not allowed', { status: 405 }), env);
    }

    // Optional auth check
    if (env.AUTH_KEY) {
      const key = request.headers.get('X-Proxy-Key') ?? new URL(request.url).searchParams.get('key');
      if (key !== env.AUTH_KEY) {
        return corsResponse(new Response('Unauthorized', { status: 401 }), env);
      }
    }

    const targetUrl = new URL(request.url).searchParams.get('url');
    if (!targetUrl) {
      return corsResponse(new Response('Missing ?url= parameter', { status: 400 }), env);
    }

    // Only allow http/https URLs
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return corsResponse(new Response('Invalid URL', { status: 400 }), env);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return corsResponse(new Response('Only http/https allowed', { status: 400 }), env);
    }

    // Check Cloudflare cache
    const cacheKey = new Request(targetUrl, { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set('X-Proxy-Cache', 'HIT');
      return corsResponse(resp, env);
    }

    // Fetch upstream
    let upstream: Response;
    try {
      upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; DailyBriefBot/1.0; +https://github.com/daily-brief)',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        redirect: 'follow',
        cf: { cacheTtl: CACHE_TTL, cacheEverything: true },
      });
    } catch (err) {
      return corsResponse(
        new Response(`Upstream fetch failed: ${(err as Error).message}`, { status: 502 }),
        env,
      );
    }

    if (!upstream.ok) {
      return corsResponse(
        new Response(`Upstream returned HTTP ${upstream.status}`, { status: 502 }),
        env,
      );
    }

    const body = await upstream.text();
    const contentType = upstream.headers.get('Content-Type') ?? 'application/xml; charset=utf-8';

    const response = new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Proxy-Cache': 'MISS',
      },
    });

    // Store in cache (non-blocking)
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return corsResponse(response, env);
  },
};

function corsResponse(response: Response, env: Env): Response {
  const allowed = env.ALLOWED_ORIGIN ?? '*';
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowed);
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'X-Proxy-Key');
  headers.set('Vary', 'Origin');
  return new Response(response.body, { status: response.status, headers });
}
