export type FeedLanguage = 'en' | 'es' | string;
export type FeedTier = 'featured' | 'popular' | 'niche';

export interface RecommendedFeed {
  url: string;
  title: string;
  description: string;
  favicon: string | null;
  website: string | null;
  language: FeedLanguage;
  suggestedCategory: string;
  tags: string[];
  subscribers: number | null;
  tier: FeedTier;
  lastVerified: string; // ISO date
}

interface CatalogFile {
  version: string;
  updatedAt: string;
  feeds: RecommendedFeed[];
}

const TIER_BONUS: Record<FeedTier, number> = {
  featured: 0.40,
  popular:  0.20,
  niche:    0.00,
};

/** Module-level cache — survives re-renders, resets on page reload. */
let catalogCache: RecommendedFeed[] | null = null;

async function loadCatalog(): Promise<RecommendedFeed[]> {
  if (catalogCache) return catalogCache;
  const res = await fetch('/recommended-feeds.json');
  if (!res.ok) throw new Error('Could not load recommendations.');
  const data = (await res.json()) as CatalogFile;
  catalogCache = data.feeds ?? [];
  return catalogCache;
}

/**
 * Scores a feed 0–1+ for ranking purposes.
 *
 * Components:
 *  - popularityScore  0–0.50  log-normalized Feedly subscriber count
 *  - tierBonus        0–0.40  editorial quality tier
 *  - languageBoost    0 or 0.30  matches the user's app language
 *  - freshnessBoost   0 or 0.10  verified within the last 30 days
 */
export function scoreRecommendedFeed(
  feed: RecommendedFeed,
  userLanguage: FeedLanguage,
): number {
  const popularityScore =
    feed.subscribers != null
      ? Math.min(Math.log10(feed.subscribers + 1) / 6, 0.5)
      : 0.05;

  const tierBonus = TIER_BONUS[feed.tier] ?? 0;
  const languageBoost = feed.language === userLanguage ? 0.3 : 0;

  const daysSinceVerified =
    (Date.now() - new Date(feed.lastVerified).getTime()) / 86_400_000;
  const freshnessBoost = daysSinceVerified < 30 ? 0.1 : 0;

  return popularityScore + tierBonus + languageBoost + freshnessBoost;
}

/**
 * Returns the curated feed list, excluding already-subscribed feeds,
 * sorted by descending score.
 *
 * @param userLanguage   ISO 639-1 code from LanguageContext ('en' | 'es')
 * @param existingUrls   Set of normalised feed URLs already in the store
 * @param languageFilter 'mine' = user language only, 'all' = no filter
 */
export async function getRecommendedFeeds(
  userLanguage: FeedLanguage,
  existingUrls: Set<string>,
  languageFilter: 'mine' | 'all' = 'mine',
): Promise<RecommendedFeed[]> {
  const catalog = await loadCatalog();

  return catalog
    .filter((f) => !existingUrls.has(f.url.toLowerCase()))
    .filter((f) => languageFilter === 'all' || f.language === userLanguage)
    .sort(
      (a, b) =>
        scoreRecommendedFeed(b, userLanguage) -
        scoreRecommendedFeed(a, userLanguage),
    );
}

/** Invalidate the module cache (useful in tests). */
export function _resetCatalogCache(): void {
  catalogCache = null;
}
