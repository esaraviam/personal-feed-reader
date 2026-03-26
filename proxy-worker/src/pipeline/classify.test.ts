import { describe, it, expect } from 'vitest';
import { classifyArticle } from './classify';

const HOUR_MS = 60 * 60 * 1000;

// ── Topic detection ───────────────────────────────────────────────────────────

describe('classifyArticle — topic detection', () => {
  it('detects AI topic from title keywords', () => {
    const r = classifyArticle('OpenAI releases new GPT model', 'TechCrunch', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('AI');
  });

  it('detects Technology topic', () => {
    const r = classifyArticle('Apple unveils new MacBook chip', 'The Verge', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Technology');
  });

  it('detects Finance topic', () => {
    const r = classifyArticle('Federal Reserve raises interest rate again', 'Bloomberg', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Finance');
  });

  it('detects Politics topic', () => {
    const r = classifyArticle('Senate passes new legislation on healthcare', 'Reuters', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Politics');
  });

  it('detects Health topic', () => {
    const r = classifyArticle('FDA approves new cancer drug after clinical trial', 'Reuters', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Health');
  });

  it('detects Science topic', () => {
    const r = classifyArticle('NASA discovers asteroid near Mars', 'Science Daily', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Science');
  });

  it('detects Sports topic', () => {
    const r = classifyArticle('FIFA World Cup final results', 'ESPN', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Sports');
  });

  it('detects Entertainment topic', () => {
    const r = classifyArticle('Oscar nominations announced for best film', 'Variety', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('Entertainment');
  });

  it('assigns General when no topic matches', () => {
    const r = classifyArticle('Something completely generic', 'Unknown Source', 1, 1 * HOUR_MS);
    expect(r.topics).toEqual(['General']);
  });

  it('can detect multiple topics for a multi-domain article', () => {
    const r = classifyArticle('OpenAI startup raises venture capital in IPO', 'Bloomberg', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('AI');
    expect(r.topics).toContain('Finance');
  });

  it('is case-insensitive', () => {
    const r = classifyArticle('CHATGPT BREAKS RECORDS', 'Tech Blog', 1, 1 * HOUR_MS);
    expect(r.topics).toContain('AI');
  });
});

// ── Region detection ──────────────────────────────────────────────────────────

describe('classifyArticle — region detection', () => {
  it('detects Chile', () => {
    const r = classifyArticle('Boric anuncia nuevo plan en Santiago', 'La Tercera', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Chile');
  });

  it('detects USA', () => {
    const r = classifyArticle('Trump returns to Washington', 'CNN', 1, 1 * HOUR_MS);
    expect(r.region).toBe('USA');
  });

  it('detects Europe', () => {
    const r = classifyArticle('EU announces new climate policy in Brussels', 'EuroNews', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Europe');
  });

  it('detects Latin America', () => {
    const r = classifyArticle('Argentina faces new economic challenge', 'Infobae', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Latin America');
  });

  it('detects Asia', () => {
    const r = classifyArticle('Xi Jinping meets Japan leaders in Beijing', 'SCMP', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Asia');
  });

  it('falls back to Global for unrecognized locations', () => {
    const r = classifyArticle('Scientists make new discovery', 'Science Journal', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Global');
  });

  it('Chile takes priority over Latin America (listed first)', () => {
    const r = classifyArticle('Chile y Argentina firman acuerdo en Santiago', 'Source', 1, 1 * HOUR_MS);
    expect(r.region).toBe('Chile');
  });
});

// ── Importance scoring ────────────────────────────────────────────────────────

describe('classifyArticle — importance scoring', () => {
  it('score is between 0 and 1 (inclusive)', () => {
    const r = classifyArticle('Any article title', 'Any Source', 5, 2 * HOUR_MS);
    expect(r.importance).toBeGreaterThanOrEqual(0);
    expect(r.importance).toBeLessThanOrEqual(1);
  });

  it('high-signal topic + fresh article scores higher than low-signal + old', () => {
    const high = classifyArticle('Federal Reserve raises interest rate', 'Bloomberg', 5, 1 * HOUR_MS);
    const low  = classifyArticle('Weekend sports update', 'ESPN', 1, 72 * HOUR_MS);
    expect(high.importance).toBeGreaterThan(low.importance);
  });

  it('recent articles (< 6h) get higher recency bonus than older ones (> 48h)', () => {
    const fresh = classifyArticle('Generic news title', 'Source', 1, 1 * HOUR_MS);
    const stale = classifyArticle('Generic news title', 'Source', 1, 50 * HOUR_MS);
    expect(fresh.importance).toBeGreaterThan(stale.importance);
  });

  it('higher source priority increases score', () => {
    const highPriority = classifyArticle('Same title', 'Source', 10, 12 * HOUR_MS);
    const lowPriority  = classifyArticle('Same title', 'Source', 1,  12 * HOUR_MS);
    expect(highPriority.importance).toBeGreaterThan(lowPriority.importance);
  });

  it('multi-topic articles get breadth bonus', () => {
    // 3+ topics should score higher than 1 topic with same other signals
    const multi = classifyArticle(
      'AI startup raises venture capital in federal reserve policy shift',
      'Bloomberg', 1, 1 * HOUR_MS,
    );
    const single = classifyArticle('OpenAI releases model', 'Blog', 1, 1 * HOUR_MS);
    // multi-topic gets breadth signal; both are fresh AI articles
    expect(multi.topics.length).toBeGreaterThanOrEqual(2);
    // multi-topic should have at least as high a score
    expect(multi.importance).toBeGreaterThanOrEqual(single.importance);
  });

  it('caps importance at 1.0', () => {
    // Max signals: high-signal topic + priority=10 + very fresh + multi-topic
    const r = classifyArticle(
      'AI machine learning federal reserve interest rate',
      'Bloomberg', 10, 0,
    );
    expect(r.importance).toBeLessThanOrEqual(1.0);
  });
});
