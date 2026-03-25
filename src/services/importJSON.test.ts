import { describe, it, expect } from 'vitest';
import { parseJSONBackup } from './importJSON';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeFile(content: string, name = 'backup.json'): File {
  return new File([content], name, { type: 'application/json' });
}

const validCategory = {
  id: 'cat_1',
  name: 'Tech',
  color: '#6366f1',
  icon: '💻',
  order: 0,
  isDefault: false,
  createdAt: 1700000000000,
};

const validFeed = {
  id: 'feed_1',
  name: 'TechCrunch',
  url: 'https://techcrunch.com/feed/',
  categoryId: 'cat_1',
  active: true,
};

function validPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    version: '1',
    exportedAt: '2026-03-25T00:00:00.000Z',
    categories: [validCategory],
    feeds: [validFeed],
    ...overrides,
  });
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('parseJSONBackup', () => {
  // Happy path
  it('returns ok:true for a valid backup', async () => {
    const result = await parseJSONBackup(makeFile(validPayload()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.version).toBe('1');
      expect(result.data.categories).toHaveLength(1);
      expect(result.data.feeds).toHaveLength(1);
    }
  });

  it('preserves exportedAt when present', async () => {
    const result = await parseJSONBackup(makeFile(validPayload()));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.exportedAt).toBe('2026-03-25T00:00:00.000Z');
  });

  it('falls back to empty string when exportedAt is absent', async () => {
    const payload = JSON.stringify({ version: '1', categories: [validCategory], feeds: [validFeed] });
    const result = await parseJSONBackup(makeFile(payload));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.exportedAt).toBe('');
  });

  // JSON parsing errors
  it('rejects non-JSON content', async () => {
    const result = await parseJSONBackup(makeFile('not json at all'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/not valid JSON/i);
  });

  // Top-level shape errors
  it('rejects an array at the root', async () => {
    const result = await parseJSONBackup(makeFile('[]'));
    expect(result.ok).toBe(false);
  });

  it('rejects a file missing the version field', async () => {
    const payload = JSON.stringify({ categories: [validCategory], feeds: [validFeed] });
    const result = await parseJSONBackup(makeFile(payload));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/version/i);
  });

  it('rejects a file where categories is not an array', async () => {
    const result = await parseJSONBackup(makeFile(validPayload({ categories: null })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/categories/i);
  });

  it('rejects a file where feeds is not an array', async () => {
    const result = await parseJSONBackup(makeFile(validPayload({ feeds: 'bad' })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/feeds/i);
  });

  // Version guard
  it('rejects an unsupported version', async () => {
    const result = await parseJSONBackup(makeFile(validPayload({ version: '99' })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported/i);
  });

  // Category validation
  it('rejects a category missing an id', async () => {
    const badCat = { ...validCategory, id: '' };
    const result = await parseJSONBackup(makeFile(validPayload({ categories: [badCat] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/category at index 0.*id/i);
  });

  it('rejects a category missing a name', async () => {
    const badCat = { ...validCategory, name: '   ' };
    const result = await parseJSONBackup(makeFile(validPayload({ categories: [badCat] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/name/i);
  });

  it('rejects a category with a non-number order', async () => {
    const badCat = { ...validCategory, order: 'first' };
    const result = await parseJSONBackup(makeFile(validPayload({ categories: [badCat] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/order/i);
  });

  // Feed validation
  it('rejects a feed missing a url', async () => {
    const badFeed = { ...validFeed, url: '' };
    const result = await parseJSONBackup(makeFile(validPayload({ feeds: [badFeed] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/feed at index 0.*url/i);
  });

  it('rejects a feed with a non-boolean active field', async () => {
    const badFeed = { ...validFeed, active: 1 };
    const result = await parseJSONBackup(makeFile(validPayload({ feeds: [badFeed] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/active/i);
  });

  it('rejects a feed missing a categoryId', async () => {
    const badFeed = { ...validFeed, categoryId: '' };
    const result = await parseJSONBackup(makeFile(validPayload({ feeds: [badFeed] })));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/categoryId/i);
  });

  // Empty arrays are valid
  it('accepts a backup with no categories and no feeds', async () => {
    const payload = JSON.stringify({ version: '1', exportedAt: '', categories: [], feeds: [] });
    const result = await parseJSONBackup(makeFile(payload));
    expect(result.ok).toBe(true);
  });
});
