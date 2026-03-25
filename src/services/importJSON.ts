import type { FeedSource, UserCategory } from '../domain/types';
import type { FeedExport } from './exportJSON';

export type ImportResult =
  | { ok: true;  data: FeedExport }
  | { ok: false; error: string };

/** Known schema versions this app can parse. */
const SUPPORTED_VERSIONS = new Set(['1']);

/**
 * Reads a File, parses the JSON, validates the structure, and returns
 * a typed discriminated union — never throws to the caller.
 *
 * Validation checks (in order):
 *  1. File is readable text
 *  2. Content is valid JSON
 *  3. Top-level shape: version, categories[], feeds[]
 *  4. version is a known value
 *  5. Each category has required fields with non-empty strings
 *  6. Each feed has required fields with non-empty strings
 */
export async function parseJSONBackup(file: File): Promise<ImportResult> {
  // 1. Read file as text
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Could not read the file.' };
  }

  // 2. Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }

  // 3. Top-level shape
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid backup format: expected a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;

  if (!('version' in obj)) {
    return { ok: false, error: 'Invalid backup: missing "version" field.' };
  }
  if (!Array.isArray(obj.categories)) {
    return { ok: false, error: 'Invalid backup: "categories" must be an array.' };
  }
  if (!Array.isArray(obj.feeds)) {
    return { ok: false, error: 'Invalid backup: "feeds" must be an array.' };
  }

  // 4. Version guard
  if (!SUPPORTED_VERSIONS.has(String(obj.version))) {
    return {
      ok: false,
      error: `Unsupported backup version "${String(obj.version)}". This app supports versions: ${[...SUPPORTED_VERSIONS].join(', ')}.`,
    };
  }

  // 5. Validate categories
  for (let i = 0; i < (obj.categories as unknown[]).length; i++) {
    const result = validateCategory(obj.categories[i], i);
    if (result) return { ok: false, error: result };
  }

  // 6. Validate feeds
  for (let i = 0; i < (obj.feeds as unknown[]).length; i++) {
    const result = validateFeed(obj.feeds[i], i);
    if (result) return { ok: false, error: result };
  }

  return {
    ok: true,
    data: {
      version: '1',
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
      categories: obj.categories as UserCategory[],
      feeds: obj.feeds as FeedSource[],
    },
  };
}

// ─── field validators ──────────────────────────────────────────────────────────

/** Returns an error string if invalid, undefined if valid. */
function validateCategory(item: unknown, index: number): string | undefined {
  if (typeof item !== 'object' || item === null) {
    return `Category at index ${index} is not an object.`;
  }
  const c = item as Record<string, unknown>;
  if (!nonEmptyString(c.id))    return `Category at index ${index} is missing a valid "id".`;
  if (!nonEmptyString(c.name))  return `Category at index ${index} is missing a valid "name".`;
  if (!nonEmptyString(c.color)) return `Category at index ${index} is missing a valid "color".`;
  if (!nonEmptyString(c.icon))  return `Category at index ${index} is missing a valid "icon".`;
  if (typeof c.order !== 'number') return `Category at index ${index} has an invalid "order".`;
}

/** Returns an error string if invalid, undefined if valid. */
function validateFeed(item: unknown, index: number): string | undefined {
  if (typeof item !== 'object' || item === null) {
    return `Feed at index ${index} is not an object.`;
  }
  const f = item as Record<string, unknown>;
  if (!nonEmptyString(f.id))         return `Feed at index ${index} is missing a valid "id".`;
  if (!nonEmptyString(f.name))       return `Feed at index ${index} is missing a valid "name".`;
  if (!nonEmptyString(f.url))        return `Feed at index ${index} is missing a valid "url".`;
  if (!nonEmptyString(f.categoryId)) return `Feed at index ${index} is missing a valid "categoryId".`;
  if (typeof f.active !== 'boolean') return `Feed at index ${index} has an invalid "active" field.`;
}

function nonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}
