const WORKER_URL = import.meta.env.VITE_PROXY_URL as string;
const WORKER_KEY = import.meta.env.VITE_PROXY_KEY as string | undefined;

export interface FeedSearchResult {
  url: string;
  title: string;
  description: string;
  favicon: string | null;
  website: string | null;
  subscribers: number | null;
}

interface FeedlyResult {
  feedId?: string;     // "feed/<url>"
  title?: string;
  description?: string;
  iconUrl?: string;
  visualUrl?: string;
  website?: string;
  subscribers?: number;
}

/**
 * Search for RSS/Atom feeds using Feedly's free search API.
 * Routed through the Cloudflare Worker to avoid CORS.
 */
export async function searchFeeds(query: string): Promise<FeedSearchResult[]> {
  if (!query.trim()) return [];

  const searchUrl = `https://cloud.feedly.com/v3/search/feeds?query=${encodeURIComponent(query.trim())}&count=20`;
  const endpoint = `${WORKER_URL}?url=${encodeURIComponent(searchUrl)}`;
  const headers: Record<string, string> = {};
  if (WORKER_KEY) headers['X-Proxy-Key'] = WORKER_KEY;

  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);

  const text = await res.text();
  let data: { results?: FeedlyResult[] };
  try {
    data = JSON.parse(text) as { results?: FeedlyResult[] };
  } catch {
    throw new Error('Invalid response from search service.');
  }

  const results = data.results ?? [];

  return results
    .map((item) => {
      // Feedly feedId format: "feed/<url>"
      const url = item.feedId?.replace(/^feed\//, '').trim() ?? '';
      if (!url) return null;
      return {
        url,
        title: (item.title ?? '').trim() || new URL(url).hostname,
        description: (item.description ?? '').trim(),
        favicon: item.iconUrl ?? null,
        website: item.website ?? null,
        subscribers: item.subscribers ?? null,
      };
    })
    .filter((r): r is FeedSearchResult => r !== null && r.url.length > 0);
}
