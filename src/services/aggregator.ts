import { XMLParser } from 'fast-xml-parser';
import type { Article, FeedSource } from '../domain/types';

// Primary proxy and fallback
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const TIMEOUT_MS = 10000;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ['item', 'entry'].includes(tagName),
});

function parseDate(raw: string | undefined): number {
  if (!raw) return Date.now();
  const ts = Date.parse(raw);
  return isNaN(ts) ? Date.now() : ts;
}

type XmlNode = Record<string, unknown>;

function extractItems(doc: XmlNode): XmlNode[] {
  // RSS 2.0: rss > channel > item[]
  const rss = doc['rss'] as XmlNode | undefined;
  if (rss) {
    const channel = rss['channel'] as XmlNode | undefined;
    return (channel?.['item'] as XmlNode[] | undefined) ?? [];
  }

  // Atom: feed > entry[]
  const feed = doc['feed'] as XmlNode | undefined;
  if (feed) {
    return (feed['entry'] as XmlNode[] | undefined) ?? [];
  }

  // RSS 1.0 / RDF: RDF > item[]
  const rdf = doc['rdf:RDF'] as XmlNode | undefined;
  if (rdf) {
    return (rdf['item'] as XmlNode[] | undefined) ?? [];
  }

  return [];
}

function extractLink(item: XmlNode): string {
  const link = item['link'];
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alt = link.find((l: XmlNode) => !l['@_rel'] || l['@_rel'] === 'alternate');
    if (alt) return String(alt['@_href'] ?? '').trim();
  }
  if (typeof link === 'object' && link !== null) {
    const href = (link as XmlNode)['@_href'];
    if (typeof href === 'string') return href.trim();
  }
  return '';
}

function normalizeItem(item: XmlNode, source: FeedSource): Article | null {
  const title = String(item['title'] ?? '').trim();
  const link = extractLink(item);

  if (!title || !link) return null;

  const guid = String(item['guid'] ?? item['id'] ?? link).trim();

  const pubDate =
    (item['pubDate'] as string | undefined) ??
    (item['published'] as string | undefined) ??
    (item['updated'] as string | undefined) ??
    (item['dc:date'] as string | undefined);

  return {
    id: guid.toLowerCase(),
    title,
    link,
    source: source.name,
    category: source.category,
    publishedAt: parseDate(pubDate),
    score: 0,
  };
}

async function tryFetch(url: string, proxyFn: (u: string) => string): Promise<XmlNode[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(proxyFn(url), { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    if (!text.trim().startsWith('<')) {
      throw new Error(`Non-XML response (starts with: ${text.slice(0, 80)})`);
    }

    const doc = xmlParser.parse(text) as XmlNode;
    const items = extractItems(doc);

    if (items.length === 0) {
      throw new Error('Parsed XML but found 0 items');
    }

    return items;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchFeedWithRetry(url: string): Promise<XmlNode[]> {
  // Try each proxy in order; first success wins
  for (const proxyFn of PROXIES) {
    try {
      return await tryFetch(url, proxyFn);
    } catch (err) {
      console.warn(`[aggregator] proxy failed for ${url}:`, err);
    }
  }

  console.error(`[aggregator] all proxies failed for ${url}`);
  return [];
}

export async function aggregateFeeds(sources: FeedSource[]): Promise<Article[]> {
  const activeSources = sources.filter((s) => s.active);

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const items = await fetchFeedWithRetry(source.url);
      return items
        .map((item) => normalizeItem(item, source))
        .filter((a): a is Article => a !== null);
    }),
  );

  const seen = new Set<string>();
  const articles: Article[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const article of result.value) {
        if (!seen.has(article.id)) {
          seen.add(article.id);
          articles.push(article);
        }
      }
    }
  }

  return articles;
}
