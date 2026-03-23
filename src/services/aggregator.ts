import { XMLParser } from 'fast-xml-parser';
import type { Article, FeedSource } from '../domain/types';

const TIMEOUT_MS = 15000;
const CONCURRENCY = 3; // max parallel proxy requests

// Proxy strategies — tried in order
const PROXIES: Array<(url: string) => Promise<string>> = [
  // allorigins /get returns JSON {contents, status} — more reliable than /raw
  async (url) => {
    const res = await fetchWithTimeout(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) throw new Error(`allorigins HTTP ${res.status}`);
    const json = (await res.json()) as { contents?: string; status?: { http_code?: number } };
    const httpCode = json.status?.http_code ?? 200;
    if (httpCode >= 400) throw new Error(`allorigins upstream HTTP ${httpCode}`);
    return json.contents ?? '';
  },

  // corsproxy.io — correct format: ?url=ENCODED
  async (url) => {
    const res = await fetchWithTimeout(
      `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) throw new Error(`corsproxy HTTP ${res.status}`);
    return res.text();
  },
];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ['item', 'entry'].includes(tagName),
  // Be lenient — ignore namespace prefixes on root element
  processEntities: false,
  htmlEntities: true,
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

  // RSS 1.0 / RDF
  const rdf = doc['rdf:RDF'] as XmlNode | undefined;
  if (rdf) {
    return (rdf['item'] as XmlNode[] | undefined) ?? [];
  }

  // Some feeds have namespace prefixes on root — try any key containing 'RDF'
  for (const key of Object.keys(doc)) {
    if (key.includes('RDF') || key.includes('rss') || key.includes('feed')) {
      const node = doc[key] as XmlNode;
      const items =
        (node['item'] as XmlNode[] | undefined) ??
        (node['entry'] as XmlNode[] | undefined) ??
        ((node['channel'] as XmlNode | undefined)?.['item'] as XmlNode[] | undefined);
      if (items?.length) return items;
    }
  }

  return [];
}

function extractLink(item: XmlNode): string {
  const link = item['link'];
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alt = link.find((l: XmlNode) => !l['@_rel'] || l['@_rel'] === 'alternate');
    if (alt) return String(alt['@_href'] ?? '').trim();
    if (link[0]) return String((link[0] as XmlNode)['@_href'] ?? '').trim();
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

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchFeed(url: string): Promise<XmlNode[]> {
  for (const proxyFn of PROXIES) {
    try {
      const text = await proxyFn(url);

      if (!text?.trim()) throw new Error('Empty response');
      if (!text.trim().startsWith('<')) {
        throw new Error(`Non-XML response (starts: ${text.slice(0, 60)})`);
      }

      const doc = xmlParser.parse(text) as XmlNode;
      const items = extractItems(doc);

      if (items.length === 0) throw new Error('Parsed XML but found 0 items');
      return items;
    } catch (err) {
      console.warn(`[aggregator] proxy failed for ${url}:`, (err as Error).message);
    }
  }

  console.error(`[aggregator] all proxies failed for ${url}`);
  return [];
}

// Run promises with max N concurrent
async function pLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function aggregateFeeds(sources: FeedSource[]): Promise<Article[]> {
  const activeSources = sources.filter((s) => s.active);
  if (activeSources.length === 0) return [];

  const tasks = activeSources.map(
    (source) => async (): Promise<Article[]> => {
      const items = await fetchFeed(source.url);
      return items
        .map((item) => normalizeItem(item, source))
        .filter((a): a is Article => a !== null);
    },
  );

  const results = await pLimit(tasks, CONCURRENCY);

  const seen = new Set<string>();
  const articles: Article[] = [];

  for (const batch of results) {
    for (const article of batch) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        articles.push(article);
      }
    }
  }

  return articles;
}
