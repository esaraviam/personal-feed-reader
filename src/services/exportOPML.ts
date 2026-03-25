import type { FeedSource, UserCategory } from '../domain/types';

/**
 * Generates a valid OPML 2.0 document from the user's feeds and categories.
 *
 * Structure:
 *  - Active feeds are grouped under their category folder (<outline text="Category">)
 *  - Inactive feeds are collected under a special "_inactive" folder so no
 *    data is silently lost during export
 *  - Categories with no feeds are omitted (keeps the output clean)
 */
export function generateOPML(
  feeds: FeedSource[],
  categories: UserCategory[],
): string {
  const now = new Date().toUTCString();

  // Build a lookup map for fast category name resolution
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Separate active and inactive feeds
  const activeFeeds = feeds.filter((f) => f.active);
  const inactiveFeeds = feeds.filter((f) => !f.active);

  // Group active feeds by categoryId, preserving category order
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const byCategory = new Map<string, FeedSource[]>();
  for (const feed of activeFeeds) {
    const existing = byCategory.get(feed.categoryId) ?? [];
    byCategory.set(feed.categoryId, [...existing, feed]);
  }

  function feedOutline(feed: FeedSource): string {
    return `      <outline type="rss" text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" xmlUrl="${escapeXml(feed.url)}" />`;
  }

  // Build category folder outlines (skip empty categories)
  const categoryOutlines = sortedCategories
    .filter((cat) => (byCategory.get(cat.id) ?? []).length > 0)
    .map((cat) => {
      const feedLines = (byCategory.get(cat.id) ?? []).map(feedOutline).join('\n');
      return `    <outline text="${escapeXml(cat.name)}" title="${escapeXml(cat.name)}">\n${feedLines}\n    </outline>`;
    })
    .join('\n');

  // Inactive folder (only rendered if there are inactive feeds)
  const inactiveOutline =
    inactiveFeeds.length > 0
      ? `    <outline text="_inactive" title="_inactive">\n${inactiveFeeds.map(feedOutline).join('\n')}\n    </outline>`
      : '';

  const body = [categoryOutlines, inactiveOutline].filter(Boolean).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    '    <title>Daily Brief</title>',
    `    <dateCreated>${now}</dateCreated>`,
    '  </head>',
    '  <body>',
    body,
    '  </body>',
    '</opml>',
  ].join('\n');
}

/** Returns a filename with today's date, e.g. "daily-brief-feeds-2026-03-25.opml" */
export function opmlFilename(): string {
  return `daily-brief-feeds-${isoDate()}.opml`;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
