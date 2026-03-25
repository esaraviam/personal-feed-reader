import { XMLParser } from 'fast-xml-parser';
import type { CategoryId, FeedSource } from '../domain/types';

const VALID_CATEGORIES = new Set<string>(['chile', 'global', 'tech', 'custom']);

interface OutlineNode {
  '@_xmlUrl'?: string;
  '@_text'?: string;
  '@_title'?: string;
  outline?: OutlineNode[];
}

function extractFeeds(
  outlines: OutlineNode[],
  parentCategoryId: CategoryId,
  seen: Set<string>,
  result: FeedSource[],
): void {
  for (const outline of outlines) {
    const xmlUrl = outline['@_xmlUrl']?.trim();
    const name = (outline['@_text'] ?? outline['@_title'] ?? '').trim();

    if (xmlUrl) {
      const id = xmlUrl.toLowerCase();
      if (!seen.has(id)) {
        seen.add(id);
        result.push({
          id,
          name: name || xmlUrl,
          url: xmlUrl,
          categoryId: parentCategoryId,
          active: true,
          priority: 1,
        });
      }
    } else {
      // Category/folder node — only override category if name is a recognized value;
      // intermediate folders (e.g. "Programming") inherit the parent category.
      const normalized = name.toLowerCase().trim();
      const childCategoryId = VALID_CATEGORIES.has(normalized) ? normalized : parentCategoryId;
      if (outline.outline) {
        extractFeeds(outline.outline, childCategoryId, seen, result);
      }
    }
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsText(file);
  });
}

/** Max OPML file size accepted (1 MB) — prevents memory exhaustion from large files */
const MAX_OPML_BYTES = 1_000_000;

export async function parseOPML(file: File): Promise<FeedSource[]> {
  // Reject oversized files before reading
  if (file.size > MAX_OPML_BYTES) {
    throw new Error('OPML file too large (max 1 MB).');
  }

  let xml: string;
  try {
    xml = await readFileAsText(file);
  } catch {
    return [];
  }

  if (!xml.trim()) return [];

  // Reject DOCTYPE declarations entirely — prevents XXE and billion-laughs attacks.
  // Valid OPML files never need a DOCTYPE.
  if (/<!DOCTYPE/i.test(xml)) {
    throw new Error('OPML file contains a DOCTYPE declaration which is not allowed.');
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      // Always treat <outline> as an array regardless of count
      isArray: (tagName: string) => tagName === 'outline',
      // Disable entity processing to prevent XXE / entity expansion attacks
      processEntities: false,
      htmlEntities: false,
    });

    const doc = parser.parse(xml) as {
      opml?: { body?: { outline?: OutlineNode[] } };
    };

    const outlines = doc?.opml?.body?.outline ?? [];
    const result: FeedSource[] = [];
    const seen = new Set<string>();
    extractFeeds(outlines, 'custom', seen, result); // fallback: 'custom' is always a valid default
    return result;
  } catch {
    return [];
  }
}
