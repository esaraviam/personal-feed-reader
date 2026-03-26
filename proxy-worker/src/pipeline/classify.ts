/**
 * Rule-based article classifier.
 *
 * Assigns topics, detects region, and estimates importance for each article.
 * Runs client-side in the Worker — no AI call needed for this step.
 * Uses keyword matching against a curated taxonomy.
 *
 * Output shape matches the `topics`, `region`, `importance` columns in D1.
 */

export interface ClassificationResult {
  topics: string[];
  region: string;
  importance: number;
}

// ── Topic taxonomy ────────────────────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  'AI': [
    'artificial intelligence', 'machine learning', 'deep learning', 'neural network',
    'chatgpt', 'openai', 'llm', 'generative ai', 'ai model', 'gpt', 'gemini',
    'claude', 'copilot', 'automation', 'robot', 'computer vision', 'nlp',
  ],
  'Technology': [
    'tech', 'software', 'hardware', 'startup', 'app', 'device', 'gadget',
    'smartphone', 'apple', 'google', 'microsoft', 'meta', 'amazon', 'cloud',
    'cybersecurity', 'hacking', 'data breach', 'programming', 'algorithm',
    'semiconductor', 'chip', 'quantum', 'blockchain',
  ],
  'Finance': [
    'economy', 'stock market', 'investment', 'inflation', 'interest rate',
    'federal reserve', 'gdp', 'recession', 'cryptocurrency', 'bitcoin',
    'ethereum', 'crypto', 'bank', 'finance', 'nasdaq', 'dow jones',
    's&p', 'treasury', 'hedge fund', 'ipo', 'venture capital',
  ],
  'Politics': [
    'election', 'government', 'president', 'congress', 'senate', 'parliament',
    'vote', 'political', 'party', 'minister', 'legislation', 'policy',
    'democrat', 'republican', 'conservative', 'liberal', 'referendum',
    'diplomat', 'foreign policy', 'sanctions', 'white house',
  ],
  'Health': [
    'health', 'vaccine', 'virus', 'disease', 'hospital', 'doctor', 'medicine',
    'cancer', 'drug', 'fda', 'pandemic', 'covid', 'mental health', 'obesity',
    'surgery', 'clinical trial', 'pharmaceutical', 'outbreak', 'epidemic',
  ],
  'Science': [
    'science', 'research', 'study', 'discovery', 'physics', 'biology',
    'chemistry', 'space', 'nasa', 'climate', 'environment', 'fossil',
    'evolution', 'genomics', 'dna', 'mars', 'asteroid', 'telescope',
  ],
  'Sports': [
    'sports', 'football', 'soccer', 'basketball', 'tennis', 'olympic',
    'championship', 'league', 'match', 'tournament', 'player', 'fifa',
    'nba', 'nfl', 'formula 1', 'f1', 'gold medal', 'world cup',
  ],
  'Entertainment': [
    'movie', 'film', 'music', 'celebrity', 'award', 'oscar', 'grammy',
    'netflix', 'streaming', 'album', 'concert', 'tv show', 'series',
    'director', 'actor', 'actress', 'box office',
  ],
};

// Topics that indicate high-signal content (boost importance)
const HIGH_SIGNAL_TOPICS = new Set(['AI', 'Finance', 'Politics', 'Health', 'Science']);

// ── Region taxonomy ───────────────────────────────────────────────────────────

const REGION_KEYWORDS: Record<string, string[]> = {
  'Chile': [
    'chile', 'chilean', 'santiago', 'boric', 'concepción', 'valparaíso',
    'atacama', 'patagonia', 'peso chileno', 'minería chilena', 'cobre',
    'codelco', 'constitución', 'plebiscito',
  ],
  'USA': [
    'united states', 'usa', ' us ', 'american', 'washington', 'biden',
    'trump', 'congress', 'wall street', 'federal', 'new york', 'california',
    'texas', 'pentagon', 'cia', 'fbi',
  ],
  'Europe': [
    'europe', 'european', 'eu ', 'brussels', 'berlin', 'paris', 'london',
    'uk ', 'france', 'germany', 'italy', 'spain', 'nato', 'euro ',
  ],
  'Latin America': [
    'latin america', 'latinoamérica', 'argentina', 'brazil', 'méxico',
    'colombia', 'perú', 'venezuela', 'cuba', 'uruguay', 'bolivia',
  ],
  'Asia': [
    'china', 'chinese', 'beijing', 'japan', 'japanese', 'tokyo', 'india',
    'korea', 'taiwan', 'south korea', 'southeast asia', 'singapore',
    'hong kong', 'xi jinping',
  ],
};

// ── Classifier ────────────────────────────────────────────────────────────────

function matchKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Classify an article based on its title and source name.
 *
 * @param title     Article title (will be lowercased internally)
 * @param source    Feed source name (used as secondary signal)
 * @param priority  Feed priority from the feeds table (1 = normal, higher = more important)
 * @param ageMs     Article age in milliseconds (used for importance recency signal)
 */
export function classifyArticle(
  title: string,
  source: string,
  priority: number,
  ageMs: number,
): ClassificationResult {
  const text = `${title} ${source}`.toLowerCase();

  // ── Topic detection ───────────────────────────────────────────────────────
  const topics: string[] = [];
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (matchKeywords(text, keywords)) {
      topics.push(topic);
    }
  }
  if (topics.length === 0) topics.push('General');

  // ── Region detection ─────────────────────────────────────────────────────
  let region = 'Global';
  for (const [reg, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (matchKeywords(text, keywords)) {
      region = reg;
      break; // first match wins — most specific regions listed first
    }
  }

  // ── Importance score ─────────────────────────────────────────────────────
  // Combines four signals into a 0–1 score:
  //   topic signal (0–0.4): high-signal topics get a boost
  //   source priority (0–0.2): from the feeds table priority column
  //   recency (0–0.3): decays over 48 hours
  //   multi-topic breadth (0–0.1): articles spanning multiple topics

  const topicSignal  = topics.some((t) => HIGH_SIGNAL_TOPICS.has(t)) ? 0.4 : 0.15;
  const sourceSignal = Math.min(priority / 10, 0.2); // priority 1–10 → 0.02–0.2
  const HOUR_MS      = 60 * 60 * 1000;
  const recencySignal =
    ageMs < 6  * HOUR_MS ? 0.30 :
    ageMs < 24 * HOUR_MS ? 0.20 :
    ageMs < 48 * HOUR_MS ? 0.10 : 0.0;
  const breadthSignal = topics.length >= 3 ? 0.10 : topics.length >= 2 ? 0.05 : 0.0;

  const importance = Math.min(
    topicSignal + sourceSignal + recencySignal + breadthSignal,
    1.0,
  );

  return { topics, region, importance };
}
