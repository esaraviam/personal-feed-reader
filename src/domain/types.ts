export type CategoryId = string;

export interface UserCategory {
  id: CategoryId;
  name: string;
  color: string;        // hex e.g. '#f43f5e'
  icon: string;         // emoji e.g. '🇨🇱'
  order: number;
  isDefault: boolean;
  createdAt: number;    // epoch ms
}

export interface Article {
  id: string;          // guid || link
  title: string;
  link: string;
  source: string;      // feed name
  categoryId: CategoryId;
  publishedAt: number; // Date.parse(pubDate)
  score: number;       // ranking score
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  categoryId: CategoryId;
  active: boolean;
  priority: number;
}
