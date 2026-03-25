import { openDB, type IDBPDatabase } from 'idb';
import type { Article, FeedSource, UserCategory } from '../domain/types';
import { DEFAULT_CATEGORIES } from './categories';

const DB_NAME = 'daily-brief';
const DB_VERSION = 2;

interface DailyBriefDB {
  feeds: {
    key: string;
    value: FeedSource;
  };
  articles: {
    key: string;
    value: Article;
  };
  meta: {
    key: string;
    value: number;
  };
  categories: {
    key: string;
    value: UserCategory;
  };
}

async function getDB(): Promise<IDBPDatabase<DailyBriefDB>> {
  return openDB<DailyBriefDB>(DB_NAME, DB_VERSION, {
    upgrade: async (db, oldVersion, _newVersion, tx) => {
      // ── v1: initial schema ─────────────────────────────────────────────────
      if (oldVersion < 1) {
        db.createObjectStore('feeds', { keyPath: 'id' });
        db.createObjectStore('articles', { keyPath: 'id' });
        db.createObjectStore('meta');
      }

      // ── v2: add categories store + migrate category → categoryId ───────────
      if (oldVersion < 2) {
        // Seed default categories
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        for (const cat of DEFAULT_CATEGORIES) {
          await catStore.add(cat);
        }

        // Migrate feeds: rename the `category` field to `categoryId`
        // Records in v1 format have { category: string } not { categoryId: string }
        let feedCursor = await tx.objectStore('feeds').openCursor();
        while (feedCursor) {
          const rec = feedCursor.value as unknown as Record<string, unknown>;
          if (typeof rec['category'] === 'string' && rec['categoryId'] === undefined) {
            const migrated = Object.fromEntries(
              Object.entries(rec)
                .filter(([k]) => k !== 'category')
                .concat([['categoryId', rec['category']]]),
            );
            await feedCursor.update(migrated as unknown as FeedSource);
          }
          feedCursor = await feedCursor.continue();
        }

        // Migrate articles: same field rename
        let articleCursor = await tx.objectStore('articles').openCursor();
        while (articleCursor) {
          const rec = articleCursor.value as unknown as Record<string, unknown>;
          if (typeof rec['category'] === 'string' && rec['categoryId'] === undefined) {
            const migrated = Object.fromEntries(
              Object.entries(rec)
                .filter(([k]) => k !== 'category')
                .concat([['categoryId', rec['category']]]),
            );
            await articleCursor.update(migrated as unknown as Article);
          }
          articleCursor = await articleCursor.continue();
        }
      }
    },
  });
}

export async function saveFeeds(feeds: FeedSource[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('feeds', 'readwrite');
  await tx.store.clear();
  await Promise.all(feeds.map((f) => tx.store.put(f)));
  await tx.done;
}

export async function loadFeeds(): Promise<FeedSource[]> {
  const db = await getDB();
  return db.getAll('feeds');
}

export async function saveArticles(articles: Article[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('articles', 'readwrite');
  await tx.store.clear();
  await Promise.all(articles.map((a) => tx.store.put(a)));
  await tx.done;
}

export async function loadArticles(): Promise<Article[]> {
  const db = await getDB();
  return db.getAll('articles');
}

export async function saveLastSync(timestamp: number): Promise<void> {
  const db = await getDB();
  await db.put('meta', timestamp, 'lastSync');
}

export async function loadLastSync(): Promise<number | null> {
  const db = await getDB();
  const value = await db.get('meta', 'lastSync');
  return value ?? null;
}

export async function saveCategories(categories: UserCategory[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('categories', 'readwrite');
  await tx.store.clear();
  await Promise.all(categories.map((c) => tx.store.put(c)));
  await tx.done;
}

export async function loadCategories(): Promise<UserCategory[]> {
  const db = await getDB();
  return db.getAll('categories');
}
