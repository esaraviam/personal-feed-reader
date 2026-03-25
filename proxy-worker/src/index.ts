/**
 * Daily Brief — CORS Proxy Worker
 *
 * Fetches RSS/Atom feeds on behalf of the browser and adds CORS headers.
 * Security hardened: SSRF protection, origin allowlist, auth enforcement.
 */

export interface Env {
  /** Required: comma-separated allowed origins, e.g. "https://personal-feed-reader.vercel.app" */
  ALLOWED_ORIGIN?: string;
  /** Optional: shared secret; if set, ALL requests must supply it */
  AUTH_KEY?: string;
}

const CACHE_TTL = 300; // 5 minutes

/**
 * Block SSRF targets — private IPs, loopback, link-local, and cloud metadata endpoints.
 * A Cloudflare Worker has limited internal network access, but defense-in-depth matters.
 */
function isBlockedHost(url: URL): boolean {
  const h = url.hostname.toLowerCase();

  // Cloud metadata endpoints
  if (h === 'metadata.google.internal') return true;
  if (h === '169.254.169.254') return true; // AWS/Azure/GCP IMDS

  // Loopback
  if (h === 'localhost') return true;
  if (h === '::1') return true;

  // Numeric IP checks — parse dotted-decimal
  const parts = h.split('.').map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [a, b] = parts;
    if (a === 127) return true;                          // 127.0.0.0/8 loopback
    if (a === 10) return true;                           // 10.0.0.0/8 private
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true;             // 192.168.0.0/16 private
    if (a === 169 && b === 254) return true;             // 169.254.0.0/16 link-local
    if (a === 0) return true;                            // 0.0.0.0/8 "this" network
    if (a === 100 && b >= 64 && b <= 127) return true;  // 100.64.0.0/10 CGNAT
  }

  // IPv6 private/link-local prefixes
  if (h.startsWith('fc00:') || h.startsWith('fd') || h.startsWith('fe80:')) return true;

  return false;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const allowedOrigin = env.ALLOWED_ORIGIN ?? '*';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin),
      });
    }

    if (request.method !== 'GET') {
      return errorResponse('Method not allowed', 405, allowedOrigin);
    }

    // Enforce origin allowlist when configured (preferred over AUTH_KEY for browser clients)
    if (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== '*') {
      const origin = request.headers.get('Origin') ?? '';
      const allowed = env.ALLOWED_ORIGIN.split(',').map((s) => s.trim());
      // Non-browser tools won't send Origin; we only block if Origin is present and wrong
      if (origin && !allowed.includes(origin)) {
        return errorResponse('Forbidden origin', 403, allowedOrigin);
      }
    }

    // Auth key check (optional but enforced if set)
    if (env.AUTH_KEY) {
      const key =
        request.headers.get('X-Proxy-Key') ??
        new URL(request.url).searchParams.get('key');
      if (key !== env.AUTH_KEY) {
        return errorResponse('Unauthorized', 401, allowedOrigin);
      }
    }

    const targetUrl = new URL(request.url).searchParams.get('url');
    if (!targetUrl) {
      return errorResponse('Missing ?url= parameter', 400, allowedOrigin);
    }

    // Validate and parse target URL
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return errorResponse('Invalid URL', 400, allowedOrigin);
    }

    // Only allow http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return errorResponse('Only http/https URLs allowed', 400, allowedOrigin);
    }

    // SSRF protection — block private/internal hosts
    if (isBlockedHost(parsed)) {
      return errorResponse('Target host not allowed', 403, allowedOrigin);
    }

    // Check Cloudflare cache
    const cacheKey = new Request(targetUrl, { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const resp = new Response(cached.body, cached);
      resp.headers.set('X-Proxy-Cache', 'HIT');
      return addCors(resp, allowedOrigin);
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
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Proxy-Cache': 'MISS',
        ...corsHeaders(allowedOrigin),
      },
    });

    // Store in CF cache (non-blocking)
    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  },
};

function corsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'X-Proxy-Key',
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
