import { describe, it, expect } from 'vitest';
import { generateJSON, jsonFilename } from './exportJSON';
import type { FeedSource, UserCategory } from '../domain/types';

const category: UserCategory = {
  id: 'tech', name: 'Tech', color: '#8b5cf6', icon: '💻',
  order: 0, isDefault: true, createdAt: 0,
};
const feed: FeedSource = {
  id: 'https://techcrunch.com/feed/',
  name: 'TechCrunch',
  url: 'https://techcrunch.com/feed/',
  categoryId: 'tech',
  active: true,
  priority: 1,
};

describe('generateJSON', () => {
  it('produces valid JSON', () => {
    const output = generateJSON([feed], [category]);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it('includes version field', () => {
    const parsed = JSON.parse(generateJSON([feed], [category]));
    expect(parsed.version).toBe('1');
  });

  it('includes exportedAt as ISO 8601 string', () => {
    const parsed = JSON.parse(generateJSON([feed], [category]));
    expect(parsed.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes all feeds', () => {
    const parsed = JSON.parse(generateJSON([feed], [category]));
    expect(parsed.feeds).toHaveLength(1);
    expect(parsed.feeds[0].url).toBe(feed.url);
  });

  it('includes all categories', () => {
    const parsed = JSON.parse(generateJSON([feed], [category]));
    expect(parsed.categories).toHaveLength(1);
    expect(parsed.categories[0].id).toBe('tech');
  });

  it('sorts categories by order', () => {
    const cat2: UserCategory = { ...category, id: 'chile', order: 1 };
    const cat1: UserCategory = { ...category, id: 'tech',  order: 0 };
    // pass deliberately reversed
    const parsed = JSON.parse(generateJSON([feed], [cat2, cat1]));
    expect(parsed.categories[0].id).toBe('tech');
    expect(parsed.categories[1].id).toBe('chile');
  });

  it('includes inactive feeds', () => {
    const inactive: FeedSource = { ...feed, id: 'x', active: false };
    const parsed = JSON.parse(generateJSON([feed, inactive], [category]));
    expect(parsed.feeds).toHaveLength(2);
  });

  it('handles empty arrays gracefully', () => {
    const parsed = JSON.parse(generateJSON([], []));
    expect(parsed.feeds).toHaveLength(0);
    expect(parsed.categories).toHaveLength(0);
  });
});

describe('jsonFilename', () => {
  it('starts with daily-brief-backup- and ends with .json', () => {
    const name = jsonFilename();
    expect(name).toMatch(/^daily-brief-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
