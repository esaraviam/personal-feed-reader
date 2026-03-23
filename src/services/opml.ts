import { XMLParser } from 'fast-xml-parser';
import type { Category, FeedSource } from '../domain/types';

const VALID_CATEGORIES = new Set<string>(['chile', 'global', 'tech', 'custom']);

interface OutlineNode {
  '@_xmlUrl'?: string;
  '@_text'?: string;
  '@_title'?: string;
  outline?: OutlineNode[];
}

function extractFeeds(
  outlines: OutlineNode[],
  parentCategory: Category,
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
          category: parentCategory,
          active: true,
          priority: 1,
        });
      }
    } else {
      // Category/folder node — only override category if name is a recognized value;
      // intermediate folders (e.g. "Programming") inherit the parent category.
      const normalized = name.toLowerCase().trim();
      const childCategory = VALID_CATEGORIES.has(normalized)
        ? (normalized as Category)
        : parentCategory;
      if (outline.outline) {
        extractFeeds(outline.outline, childCategory, seen, result);
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

export async function parseOPML(file: File): Promise<FeedSource[]> {
  let xml: string;
  try {
    xml = await readFileAsText(file);
  } catch {
    return [];
  }

  if (!xml.trim()) return [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      // Always treat <outline> as an array regardless of count
      isArray: (tagName: string) => tagName === 'outline',
    });

    const doc = parser.parse(xml) as {
      opml?: { body?: { outline?: OutlineNode[] } };
    };

    const outlines = doc?.opml?.body?.outline ?? [];
    const result: FeedSource[] = [];
    const seen = new Set<string>();
    extractFeeds(outlines, 'custom', seen, result);
    return result;
  } catch {
    return [];
  }
}
