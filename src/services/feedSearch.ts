const WORKER_URL = import.meta.env.VITE_PROXY_URL as string;
const WORKER_KEY = import.meta.env.VITE_PROXY_KEY as string | undefined;

export interface FeedSearchResult {
  url: string;
  title: string;
  description: string;
  favicon: string | null;
}

interface FeedsearchItem {
  url?: string;
  title?: string;
  description?: string;
  favicon?: string;
  feed_url?: string;
}

/**
 * Search for RSS/Atom feeds matching a query using feedsearch.dev.
 * Routed through the Cloudflare Worker to avoid CORS.
 */
export async function searchFeeds(query: string): Promise<FeedSearchResult[]> {
  if (!query.trim()) return [];

  const searchUrl = `https://feedsearch.dev/api/v1/search?q=${encodeURIComponent(query.trim())}`;
  const endpoint = `${WORKER_URL}?url=${encodeURIComponent(searchUrl)}`;
  const headers: Record<string, string> = {};
  if (WORKER_KEY) headers['X-Proxy-Key'] = WORKER_KEY;

  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid response from search service.');
  }

  if (!Array.isArray(data)) return [];

  return (data as FeedsearchItem[])
    .filter((item) => item.url || item.feed_url)
    .map((item) => ({
      url: (item.url ?? item.feed_url ?? '').trim(),
      title: (item.title ?? '').trim() || new URL((item.url ?? item.feed_url ?? 'https://unknown')).hostname,
      description: (item.description ?? '').trim(),
      favicon: item.favicon ?? null,
    }))
    .filter((r) => r.url.length > 0);
}
