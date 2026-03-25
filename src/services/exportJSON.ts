import type { FeedSource, UserCategory } from '../domain/types';

/** Schema version — bump if the structure changes to enable future migrations. */
const EXPORT_VERSION = '1' as const;

export interface FeedExport {
  version: typeof EXPORT_VERSION;
  exportedAt: string;           // ISO 8601
  categories: UserCategory[];
  feeds: FeedSource[];
}

/**
 * Serialises feeds + categories to a versioned JSON backup.
 * Articles are intentionally excluded — they are ephemeral and refetched on refresh.
 */
export function generateJSON(
  feeds: FeedSource[],
  categories: UserCategory[],
): string {
  const payload: FeedExport = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    categories: [...categories].sort((a, b) => a.order - b.order),
    feeds,
  };
  return JSON.stringify(payload, null, 2);
}

/** Returns a filename with today's date, e.g. "daily-brief-backup-2026-03-25.json" */
export function jsonFilename(): string {
  return `daily-brief-backup-${new Date().toISOString().slice(0, 10)}.json`;
}
