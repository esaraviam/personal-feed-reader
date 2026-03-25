import { describe, it, expect } from 'vitest';
import { generateOPML, opmlFilename } from './exportOPML';
import type { FeedSource, UserCategory } from '../domain/types';

const techCategory: UserCategory = {
  id: 'tech', name: 'Tech', color: '#8b5cf6', icon: '💻',
  order: 0, isDefault: true, createdAt: 0,
};
const chileCategory: UserCategory = {
  id: 'chile', name: 'Chile', color: '#22c55e', icon: '🇨🇱',
  order: 1, isDefault: true, createdAt: 0,
};

const activeFeed: FeedSource = {
  id: 'https://techcrunch.com/feed/',
  name: 'TechCrunch',
  url: 'https://techcrunch.com/feed/',
  categoryId: 'tech',
  active: true,
  priority: 1,
};
const inactiveFeed: FeedSource = {
  id: 'https://old.com/feed/',
  name: 'Old Blog',
  url: 'https://old.com/feed/',
  categoryId: 'tech',
  active: false,
  priority: 1,
};
const chileFeed: FeedSource = {
  id: 'https://chile.com/feed/',
  name: 'El Mercurio',
  url: 'https://chile.com/feed/',
  categoryId: 'chile',
  active: true,
  priority: 1,
};

describe('generateOPML', () => {
  it('produces a valid XML declaration and OPML root', () => {
    const output = generateOPML([activeFeed], [techCategory]);
    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(output).toContain('<opml version="2.0">');
    expect(output).toContain('</opml>');
  });

  it('includes the feed xmlUrl attribute', () => {
    const output = generateOPML([activeFeed], [techCategory]);
    expect(output).toContain('xmlUrl="https://techcrunch.com/feed/"');
  });

  it('wraps feeds inside their category folder', () => {
    const output = generateOPML([activeFeed], [techCategory]);
    expect(output).toMatch(/<outline text="Tech"[^>]*>[\s\S]*TechCrunch[\s\S]*<\/outline>/);
  });

  it('places inactive feeds in an _inactive folder', () => {
    const output = generateOPML([activeFeed, inactiveFeed], [techCategory]);
    expect(output).toContain('text="_inactive"');
    expect(output).toContain('Old Blog');
  });

  it('omits the _inactive folder when all feeds are active', () => {
    const output = generateOPML([activeFeed], [techCategory]);
    expect(output).not.toContain('_inactive');
  });

  it('respects category order in the output', () => {
    const output = generateOPML([activeFeed, chileFeed], [techCategory, chileCategory]);
    const techPos = output.indexOf('text="Tech"');
    const chilePos = output.indexOf('text="Chile"');
    expect(techPos).toBeLessThan(chilePos);
  });

  it('skips categories with no feeds', () => {
    // chileCategory has no feeds in this call
    const output = generateOPML([activeFeed], [techCategory, chileCategory]);
    expect(output).not.toContain('text="Chile"');
  });

  it('escapes XML special characters in feed names', () => {
    const feed: FeedSource = { ...activeFeed, name: 'News & <World>' };
    const output = generateOPML([feed], [techCategory]);
    expect(output).toContain('News &amp; &lt;World&gt;');
    expect(output).not.toContain('News & <World>');
  });

  it('returns empty body when feeds array is empty', () => {
    const output = generateOPML([], [techCategory]);
    expect(output).toContain('<body>');
    expect(output).not.toContain('<outline');
  });
});

describe('opmlFilename', () => {
  it('starts with daily-brief-feeds- and ends with .opml', () => {
    const name = opmlFilename();
    expect(name).toMatch(/^daily-brief-feeds-\d{4}-\d{2}-\d{2}\.opml$/);
  });
});
