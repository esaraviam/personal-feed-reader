import { describe, it, expect } from 'vitest';
import { parseOPML } from './opml';

function makeFile(content: string, name = 'feeds.opml'): File {
  return new File([content], name, { type: 'text/x-opml' });
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_FLAT = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>My Feeds</title></head>
  <body>
    <outline text="Tech" title="Tech">
      <outline text="Hacker News" xmlUrl="https://news.ycombinator.com/rss" />
      <outline text="The Verge" xmlUrl="https://www.theverge.com/rss/index.xml" />
    </outline>
  </body>
</opml>`;

const VALID_CATEGORIES = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="chile">
      <outline text="La Tercera" xmlUrl="https://www.latercera.com/feed/" />
    </outline>
    <outline text="global">
      <outline text="BBC World" xmlUrl="https://feeds.bbci.co.uk/news/world/rss.xml" />
    </outline>
    <outline text="tech">
      <outline text="Hacker News" xmlUrl="https://news.ycombinator.com/rss" />
    </outline>
    <outline text="custom">
      <outline text="My Blog" xmlUrl="https://example.com/rss" />
    </outline>
  </body>
</opml>`;

const DEEP_NESTING = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="tech">
      <outline text="Programming">
        <outline text="Web">
          <outline text="CSS Tricks" xmlUrl="https://css-tricks.com/feed/" />
        </outline>
      </outline>
    </outline>
  </body>
</opml>`;

const WITH_DUPLICATES = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="tech">
      <outline text="HN" xmlUrl="https://news.ycombinator.com/rss" />
    </outline>
    <outline text="global">
      <outline text="Hacker News Again" xmlUrl="https://news.ycombinator.com/rss" />
    </outline>
  </body>
</opml>`;

const NO_XMLURL = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="Just a folder" />
    <outline text="Another folder">
      <outline text="Not a feed, no xmlUrl" title="ignored" />
    </outline>
  </body>
</opml>`;

const MALFORMED = `<?xml version="1.0"?>
<opml version="2.0">
  <body>
    <outline text="Unclosed`;

const UNKNOWN_CATEGORY = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline text="sports">
      <outline text="ESPN" xmlUrl="https://www.espn.com/espn/rss/news" />
    </outline>
    <outline text="Direct Feed" xmlUrl="https://example.com/rss" />
  </body>
</opml>`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parseOPML', () => {
  it('parses a flat valid OPML file and extracts feeds', async () => {
    const result = await parseOPML(makeFile(VALID_FLAT));
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Hacker News');
    expect(result[0].url).toBe('https://news.ycombinator.com/rss');
    expect(result[1].name).toBe('The Verge');
  });

  it('assigns correct category from parent outline text', async () => {
    const result = await parseOPML(makeFile(VALID_CATEGORIES));
    const chile = result.find((f) => f.name === 'La Tercera');
    const global = result.find((f) => f.name === 'BBC World');
    const tech = result.find((f) => f.name === 'Hacker News');
    const custom = result.find((f) => f.name === 'My Blog');

    expect(chile?.categoryId).toBe('chile');
    expect(global?.categoryId).toBe('global');
    expect(tech?.categoryId).toBe('tech');
    expect(custom?.categoryId).toBe('custom');
  });

  it('supports deep nesting (3+ levels)', async () => {
    const result = await parseOPML(makeFile(DEEP_NESTING));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('CSS Tricks');
    expect(result[0].categoryId).toBe('tech');
  });

  it('deduplicates feeds with the same URL', async () => {
    const result = await parseOPML(makeFile(WITH_DUPLICATES));
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://news.ycombinator.com/rss');
  });

  it('ignores outline nodes without xmlUrl', async () => {
    const result = await parseOPML(makeFile(NO_XMLURL));
    expect(result).toHaveLength(0);
  });

  it('returns empty array for malformed XML without throwing', async () => {
    const result = await parseOPML(makeFile(MALFORMED));
    expect(result).toEqual([]);
  });

  it('falls back to "custom" for unrecognized category names', async () => {
    const result = await parseOPML(makeFile(UNKNOWN_CATEGORY));
    const espn = result.find((f) => f.url === 'https://www.espn.com/espn/rss/news');
    expect(espn?.categoryId).toBe('custom');
  });

  it('falls back to "custom" for top-level feeds with no parent category', async () => {
    const result = await parseOPML(makeFile(UNKNOWN_CATEGORY));
    const direct = result.find((f) => f.url === 'https://example.com/rss');
    expect(direct?.categoryId).toBe('custom');
  });

  it('returns empty array for an empty file', async () => {
    const result = await parseOPML(makeFile(''));
    expect(result).toEqual([]);
  });

  it('sets active=true and priority=1 for all imported feeds', async () => {
    const result = await parseOPML(makeFile(VALID_FLAT));
    expect(result.every((f) => f.active === true)).toBe(true);
    expect(result.every((f) => f.priority === 1)).toBe(true);
  });
});
