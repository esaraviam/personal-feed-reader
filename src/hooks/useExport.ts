import { useCallback } from 'react';
import { useFeedStore } from '../store/feedStore';
import { generateOPML, opmlFilename } from '../services/exportOPML';
import { generateJSON, jsonFilename } from '../services/exportJSON';

/**
 * Triggers a browser file download with the given content.
 * Creates a temporary <a> element, clicks it, then revokes the object URL
 * immediately to avoid memory leaks.
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Provides two stable callbacks — one per export format — that read the
 * current store state and immediately trigger a browser download.
 *
 * No loading state is needed: generation is synchronous and instantaneous
 * for any realistic feed list size.
 */
export function useExport() {
  const { feeds, categories } = useFeedStore();

  const exportOPML = useCallback(() => {
    const content = generateOPML(feeds, categories);
    downloadFile(content, opmlFilename(), 'text/x-opml;charset=utf-8');
  }, [feeds, categories]);

  const exportJSON = useCallback(() => {
    const content = generateJSON(feeds, categories);
    downloadFile(content, jsonFilename(), 'application/json;charset=utf-8');
  }, [feeds, categories]);

  const hasFeeds = feeds.length > 0;

  return { exportOPML, exportJSON, hasFeeds };
}
