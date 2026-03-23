import { openDB, type IDBPDatabase } from 'idb';
import type { Article, FeedSource } from '../domain/types';

const DB_NAME = 'daily-brief';
const DB_VERSION = 1;

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
}

async function getDB(): Promise<IDBPDatabase<DailyBriefDB>> {
  return openDB<DailyBriefDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('feeds')) {
        db.createObjectStore('feeds', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('articles')) {
        db.createObjectStore('articles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
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
