export type Category = 'chile' | 'global' | 'tech' | 'custom';

export interface Article {
  id: string;          // guid || link
  title: string;
  link: string;
  source: string;      // feed name
  category: Category;
  publishedAt: number; // Date.parse(pubDate)
  score: number;       // ranking score
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: Category;
  active: boolean;
  priority: number;
}
