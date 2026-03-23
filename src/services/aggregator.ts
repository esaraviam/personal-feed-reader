import Parser from 'rss-parser';
import type { Article, FeedSource } from '../domain/types';

const PROXY = 'https://api.allorigins.win/raw?url=';
const TIMEOUT_MS = 5000;

const parser = new Parser({
  timeout: TIMEOUT_MS,
  customFields: {
    item: [
      ['guid', 'guid'],
      ['pubDate', 'pubDate'],
      ['dc:date', 'dcDate'],
    ],
  },
});

type RssItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  dcDate?: string;
  isoDate?: string;
};

function proxyUrl(url: string): string {
  return `${PROXY}${encodeURIComponent(url)}`;
}

function parseDate(item: RssItem): number {
  const raw = item.isoDate ?? item.pubDate ?? item.dcDate ?? '';
  const ts = Date.parse(raw);
  return isNaN(ts) ? Date.now() : ts;
}

function normalizeItem(item: RssItem, source: FeedSource): Article | null {
  const link = item.link?.trim();
  const title = item.title?.trim();

  if (!link || !title) return null;

  const id = (item.guid?.trim() || link).toLowerCase();

  return {
    id,
    title,
    link,
    source: source.name,
    category: source.category,
    publishedAt: parseDate(item),
    score: 0, // assigned by ranking engine
  };
}

async function fetchFeedWithRetry(url: string, attempt = 1): Promise<RssItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const feed = await parser.parseURL(proxyUrl(url));
    clearTimeout(timer);
    return (feed.items ?? []) as RssItem[];
  } catch (err) {
    clearTimeout(timer);
    if (attempt < 2) {
      return fetchFeedWithRetry(url, attempt + 1);
    }
    // Skip failing feed after one retry
    console.warn(`[aggregator] failed to fetch ${url}:`, err);
    return [];
  }
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
