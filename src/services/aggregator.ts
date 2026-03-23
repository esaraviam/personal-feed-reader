import { XMLParser } from 'fast-xml-parser';
import type { Article, FeedSource } from '../domain/types';

const TIMEOUT_MS = 15000;
const CONCURRENCY = 3;

// Strip UTF-8 BOM if present
function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tagName) => ['item', 'entry'].includes(tagName),
  processEntities: true,   // correctly decode &amp; &lt; &gt; etc.
  htmlEntities: true,
  ignoreDeclaration: true, // skip <?xml ...?> so root key is always the element
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
    const items = (channel?.['item'] as XmlNode[] | undefined) ?? [];
    if (items.length > 0) return items;
  }

  // Atom 1.0: feed > entry[]
  const feed = doc['feed'] as XmlNode | undefined;
  if (feed) {
    const entries = (feed['entry'] as XmlNode[] | undefined) ?? [];
    if (entries.length > 0) return entries;
  }

  // RDF / RSS 1.0 — key is usually 'rdf:RDF' or 'RDF'
  for (const key of Object.keys(doc)) {
    if (/rdf/i.test(key)) {
      const rdf = doc[key] as XmlNode;
      const items = (rdf['item'] as XmlNode[] | undefined) ?? [];
      if (items.length > 0) return items;
    }
  }

  // Namespace-prefixed or vendor-specific root — search all top-level keys
  for (const key of Object.keys(doc)) {
    const node = doc[key] as XmlNode;
    if (typeof node !== 'object' || node === null) continue;

    // Try direct items/entries on the node
    const direct =
      (node['item'] as XmlNode[] | undefined) ??
      (node['entry'] as XmlNode[] | undefined);
    if (direct?.length) return direct;

    // Try nested channel
    const channel = node['channel'] as XmlNode | undefined;
    if (channel) {
      const channelItems = (channel['item'] as XmlNode[] | undefined) ?? [];
      if (channelItems.length > 0) return channelItems;
    }
  }

  console.warn('[aggregator] extractItems: no items found. Top-level keys:', Object.keys(doc));
  return [];
}

function extractLink(item: XmlNode): string {
  const link = item['link'];
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    // Atom: prefer rel="alternate" or no rel
    const alt = (link as XmlNode[]).find(
      (l) => !l['@_rel'] || l['@_rel'] === 'alternate',
    );
    if (alt?.['@_href']) return String(alt['@_href']).trim();
    // Fallback: first href
    const first = link[0] as XmlNode | undefined;
    if (first?.['@_href']) return String(first['@_href']).trim();
  }
  if (typeof link === 'object' && link !== null) {
    const href = (link as XmlNode)['@_href'];
    if (href) return String(href).trim();
  }
  return '';
}

function normalizeItem(item: XmlNode, source: FeedSource): Article | null {
  const rawTitle = item['title'];
  const title = (
    typeof rawTitle === 'object' && rawTitle !== null
      ? String((rawTitle as XmlNode)['#text'] ?? '')
      : String(rawTitle ?? '')
  ).trim();

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

function fetchWithTimeout(url: string, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { signal: controller.signal, headers }).finally(() => clearTimeout(timer));
}

const WORKER_URL = import.meta.env.VITE_PROXY_URL as string;
const WORKER_KEY = import.meta.env.VITE_PROXY_KEY as string | undefined;

const PROXIES: Array<{ name: string; fetch: (url: string) => Promise<string> }> = [
  {
    name: 'cf-worker',
    fetch: async (url: string) => {
      const endpoint = `${WORKER_URL}?url=${encodeURIComponent(url)}`;
      const headers: Record<string, string> = {};
      if (WORKER_KEY) headers['X-Proxy-Key'] = WORKER_KEY;
      const res = await fetchWithTimeout(endpoint, headers);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        throw new Error('Received HTML instead of XML');
      }
      return text;
    },
  },
];

async function fetchFeed(url: string): Promise<XmlNode[]> {
  for (const proxy of PROXIES) {
    try {
      const raw = await proxy.fetch(url);
      const text = stripBOM(raw ?? '');

      if (!text.trim()) throw new Error('Empty response');
      if (!text.trim().startsWith('<')) {
        throw new Error(`Non-XML (starts: ${text.slice(0, 60)})`);
      }

      const doc = xmlParser.parse(text) as XmlNode;
      const items = extractItems(doc);

      if (items.length === 0) throw new Error('Parsed XML — 0 items found');
      return items;
    } catch (err) {
      console.warn(`[aggregator] ${proxy.name} failed for ${url}:`, (err as Error).message);
    }
  }

  console.error(`[aggregator] all proxies failed for ${url}`);
  return [];
}

// Concurrency-limited Promise.all with per-task error isolation
async function pLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: Array<T | undefined> = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        console.error('[aggregator] task error at index', i, err);
        results[i] = undefined;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );

  return results.filter((r): r is T => r !== undefined);
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

  const batches = await pLimit(tasks, CONCURRENCY);

  const seen = new Set<string>();
  const articles: Article[] = [];

  for (const batch of batches) {
    for (const article of batch) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        articles.push(article);
      }
    }
  }

  return articles;
}
