import type { Article, FeedSource } from '../domain/types';

const KEYWORDS = ['AI', 'economy', 'Chile', 'frontend', 'regulation'];

const HOUR_MS = 60 * 60 * 1000;

function keywordMatch(title: string): number {
  const lower = title.toLowerCase();
  return KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

function recencyScore(publishedAt: number, now: number): number {
  const ageMs = now - publishedAt;
  if (ageMs < 6 * HOUR_MS) return 3;
  if (ageMs < 24 * HOUR_MS) return 2;
  if (ageMs < 48 * HOUR_MS) return 1;
  return 0;
}

function buildPriorityMap(sources: FeedSource[]): Map<string, number> {
  return new Map(sources.map((s) => [s.name, s.priority]));
}

export function rankArticles(articles: Article[], sources: FeedSource[]): Article[] {
  const priorityMap = buildPriorityMap(sources);
  const now = Date.now();

  const scored = articles.map((article) => {
    const priority = priorityMap.get(article.source) ?? 1;
    const score =
      keywordMatch(article.title) * 2 + recencyScore(article.publishedAt, now) + priority;
    return { ...article, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}
