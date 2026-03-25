import { XMLParser } from 'fast-xml-parser';
import type { CategoryId, FeedSource } from '../domain/types';

const WORKER_URL = import.meta.env.VITE_PROXY_URL as string;
const WORKER_KEY = import.meta.env.VITE_PROXY_KEY as string | undefined;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  ignoreDeclaration: true,
});

export interface ValidatedFeed {
  url: string;
  name: string;
}

async function proxyFetch(url: string): Promise<string> {
  const endpoint = `${WORKER_URL}?url=${encodeURIComponent(url)}`;
  const headers: Record<string, string> = {};
  if (WORKER_KEY) headers['X-Proxy-Key'] = WORKER_KEY;
  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractTitle(text: string): string | null {
  try {
    const doc = xmlParser.parse(text) as Record<string, unknown>;
    // RSS 2.0
    const rss = doc['rss'] as Record<string, unknown> | undefined;
    if (rss) {
      const ch = rss['channel'] as Record<string, unknown> | undefined;
      const t = ch?.['title'];
      if (typeof t === 'string' && t.trim()) return t.trim();
    }
    // Atom
    const feed = doc['feed'] as Record<string, unknown> | undefined;
    if (feed) {
      const t = feed['title'];
      if (typeof t === 'string' && t.trim()) return t.trim();
      if (typeof t === 'object' && t !== null) {
        const text = (t as Record<string, unknown>)['#text'];
        if (typeof text === 'string' && text.trim()) return text.trim();
      }
    }
  } catch {
    // not parseable XML
  }
  return null;
}

/** Discover feed URLs from an HTML page's <link rel="alternate"> tags */
function discoverFeedLinks(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const linkRe = /<link[^>]+>/gi;
  const typeRe = /type=["'](application\/(rss|atom)\+xml|text\/xml)["']/i;
  const hrefRe = /href=["']([^"']+)["']/i;

  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const tag = match[0];
    if (!typeRe.test(tag)) continue;
    const hrefMatch = hrefRe.exec(tag);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    try {
      urls.push(new URL(href, baseUrl).href);
    } catch {
      // skip malformed
    }
  }
  return urls;
}

function isFeedContent(text: string): boolean {
  const trimmed = text.trimStart().replace(/^\uFEFF/, '');
  return trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE') && !trimmed.startsWith('<html');
}

/**
 * Validates a URL as a feed or discovers the feed URL from a website.
 * Returns the resolved feed URL + auto-detected name.
 * Throws if no valid feed is found.
 */
export async function validateFeed(rawUrl: string): Promise<ValidatedFeed> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  const text = await proxyFetch(url);

  // Direct feed URL
  if (isFeedContent(text)) {
    const name = extractTitle(text) ?? new URL(url).hostname;
    return { url, name };
  }

  // Website — try to discover feed links
  const discovered = discoverFeedLinks(text, url);
  for (const feedUrl of discovered) {
    try {
      const feedText = await proxyFetch(feedUrl);
      if (isFeedContent(feedText)) {
        const name = extractTitle(feedText) ?? new URL(feedUrl).hostname;
        return { url: feedUrl, name };
      }
    } catch {
      continue;
    }
  }

  throw new Error('No RSS/Atom feed found at this URL.');
}

/** Build a FeedSource from a validated feed result */
export function buildFeedSource(
  validated: ValidatedFeed,
  categoryId: CategoryId = 'custom',
  priority = 1,
): FeedSource {
  return {
    id: validated.url.toLowerCase(),
    name: validated.name,
    url: validated.url,
    categoryId,
    active: true,
    priority,
  };
}
