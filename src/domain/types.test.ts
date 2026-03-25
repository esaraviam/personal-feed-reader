import { describe, it, expect } from 'vitest';
import type { Article, FeedSource, CategoryId } from './types';

describe('Domain Types', () => {
  it('constructs a valid Article', () => {
    const article: Article = {
      id: 'https://example.com/article-1',
      title: 'Test Article',
      link: 'https://example.com/article-1',
      source: 'Example Feed',
      categoryId: 'tech',
      publishedAt: Date.parse('2026-03-23T10:00:00Z'),
      score: 7,
    };
    expect(article.id).toBe('https://example.com/article-1');
    expect(article.categoryId).toBe('tech');
    expect(article.score).toBe(7);
  });

  it('constructs a valid FeedSource', () => {
    const feed: FeedSource = {
      id: 'feed-1',
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      categoryId: 'tech',
      active: true,
      priority: 2,
    };
    expect(feed.active).toBe(true);
    expect(feed.priority).toBe(2);
  });

  it('CategoryId is a string type (not a union)', () => {
    const id: CategoryId = 'any-user-defined-id';
    expect(typeof id).toBe('string');
  });
});
