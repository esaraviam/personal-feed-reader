/**
 * Ingestion pipeline — Worker side.
 *
 * Fetches RSS/Atom/RDF feeds and normalizes them to NormalizedArticle records.
 * This is a server-side port of the browser-side aggregator.ts — no CORS proxy
 * needed since Workers make direct outbound requests.
 */
import { XMLParser } from 'fast-xml-parser';
import type { WorkerEnv, NormalizedArticle, FeedRecord } from '../types';
import { getActiveFeeds, insertArticles, pruneOldArticles } from '../db/queries';

const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY = 3;
const PRUNE_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (tag) => ['item', 'entry'].includes(tag),
  processEntities: true,
  htmlEntities: true,
  ignoreDeclaration: true,
});

// ── XML helpers ───────────────────────────────────────────────────────────────

type XmlNode = Record<string, unknown>;

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const t = (value as XmlNode)['#text'];
    if (t !== undefined) return String(t);
  }
  return '';
}

function extractLink(item: XmlNode): string {
  const link = item['link'];
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alt = (link as XmlNode[]).find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
    if (alt?.['@_href']) return String(alt['@_href']).trim();
    const first = link[0] as XmlNode | undefined;
    if (first?.['@_href']) return String(first['@_href']).trim();
  }
  if (typeof link === 'object' && link !== null) {
    const href = (link as XmlNode)['@_href'];
    if (href) return String(href).trim();
  }
  return '';
}

function extractItems(doc: XmlNode): XmlNode[] {
  // RSS 2.0
  const rss = doc['rss'] as XmlNode | undefined;
  if (rss) {
    const ch = rss['channel'] as XmlNode | undefined;
    const items = (ch?.['item'] as XmlNode[] | undefined) ?? [];
    if (items.length > 0) return items;
  }
  // Atom 1.0
  const feed = doc['feed'] as XmlNode | undefined;
  if (feed) {
    const entries = (feed['entry'] as XmlNode[] | undefined) ?? [];
    if (entries.length > 0) return entries;
  }
  // RDF / RSS 1.0
  for (const key of Object.keys(doc)) {
    if (/rdf/i.test(key)) {
      const rdf = doc[key] as XmlNode;
      const items = (rdf['item'] as XmlNode[] | undefined) ?? [];
      if (items.length > 0) return items;
    }
  }
  // Namespace-prefixed roots
  for (const key of Object.keys(doc)) {
    const node = doc[key] as XmlNode;
    if (typeof node !== 'object' || node === null) continue;
    const direct =
      (node['item'] as XmlNode[] | undefined) ??
      (node['entry'] as XmlNode[] | undefined);
    if (direct?.length) return direct;
    const ch = node['channel'] as XmlNode | undefined;
    if (ch) {
      const items = (ch['item'] as XmlNode[] | undefined) ?? [];
      if (items.length > 0) return items;
    }
  }
  return [];
}

function parseDate(raw: string | undefined): number {
  if (!raw) return Date.now();
  const ts = Date.parse(raw);
  return isNaN(ts) ? Date.now() : ts;
}

function normalizeItem(item: XmlNode, feed: FeedRecord, fetchedAt: number): NormalizedArticle | null {
  const title = toText(item['title']).trim();
  const link = extractLink(item);
  if (!title || !link) return null;

  const rawGuid =
    toText(item['guid'] ?? item['id'] ?? link).trim() || link;
  const id = rawGuid.toLowerCase();

  const pubDate =
    toText(item['pubDate']) ||
    toText(item['published']) ||
    toText(item['updated']) ||
    toText(item['dc:date']) ||
    undefined;

  // Extract text content when available (description / summary / content:encoded)
  const content =
    toText(item['content:encoded']) ||
    toText(item['description']) ||
    toText(item['summary']) ||
    null;

  return {
    id,
    title,
    link,
    source: feed.name,
    feedId: feed.id,
    publishedAt: parseDate(pubDate),
    fetchedAt,
    content: content ? content.slice(0, 2000) : null, // cap at 2KB
  };
}

// ── Feed fetcher ──────────────────────────────────────────────────────────────

async function fetchFeed(url: string): Promise<XmlNode[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyBriefBot/1.0)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    let text = await res.text();
    // Strip UTF-8 BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (!text.trim()) throw new Error('Empty response');
    if (!text.trim().startsWith('<')) throw new Error(`Non-XML response`);

    const doc = xmlParser.parse(text) as XmlNode;
    return extractItems(doc);
  } catch (err) {
    console.warn(`[ingest] fetchFeed failed for ${url}:`, (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// ── Concurrency helper ────────────────────────────────────────────────────────

async function pLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: Array<T | undefined> = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        console.error('[ingest] task error at index', i, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results.filter((r): r is T => r !== undefined);
}

// ── Public entry point ────────────────────────────────────────────────────────

/**
 * Run one full ingestion cycle:
 * 1. Load active feeds from D1
 * 2. Fetch + parse each feed (CONCURRENCY = 3)
 * 3. Normalize to NormalizedArticle records
 * 4. Batch-insert into D1 (duplicates by ID are skipped)
 * 5. Prune articles older than 7 days that aren't in a cluster
 *
 * Called by the cron handler every 30 minutes.
 */
export async function runIngestion(env: WorkerEnv): Promise<void> {
  const feeds = await getActiveFeeds(env.DB);
  if (feeds.length === 0) {
    console.log('[ingest] No active feeds in D1 — skipping ingestion cycle.');
    return;
  }

  const fetchedAt = Date.now();

  const tasks = feeds.map(
    (feed) => async (): Promise<NormalizedArticle[]> => {
      const items = await fetchFeed(feed.url);
      return items
        .map((item) => normalizeItem(item, feed, fetchedAt))
        .filter((a): a is NormalizedArticle => a !== null);
    },
  );

  const batches = await pLimit(tasks, CONCURRENCY);
  const articles = batches.flat();

  const inserted = await insertArticles(env.DB, articles);
  console.log(`[ingest] Cycle complete. Fetched ${articles.length} articles, inserted ${inserted} new.`);

  const pruned = await pruneOldArticles(env.DB, PRUNE_AFTER_MS);
  if (pruned > 0) {
    console.log(`[ingest] Pruned ${pruned} articles older than 7 days.`);
  }
}

// ── Exported pure helpers (for unit testing) ─────────────────────────────────

export { normalizeItem, extractItems, extractLink, toText, parseDate };
export type { XmlNode };
