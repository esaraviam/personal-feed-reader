import { describe, it, expect, vi } from 'vitest';
import { buildSummaryPrompt, parseSummaryResponse, summarizeClusters } from './summarize';
import type { SummaryInput } from './summarize';
import type { WorkerEnv } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SAMPLE_INPUT: SummaryInput = {
  clusterId: 'cluster-1',
  topic: 'AI',
  region: 'USA',
  articles: [
    { title: 'OpenAI releases GPT-5', source: 'TechCrunch' },
    { title: 'Google DeepMind unveils Gemini Ultra', source: 'Wired' },
    { title: 'AI regulation bill passes Senate', source: 'Reuters' },
    { title: 'This fourth article should be truncated', source: 'Extra' },
  ],
};

const VALID_RESPONSE = JSON.stringify({
  headline: 'AI industry races ahead with new model releases',
  insights: [
    'OpenAI and Google both released flagship models this week',
    'Regulatory pressure is increasing with new Senate bill',
    'Enterprise adoption expected to accelerate',
  ],
  impact: 'These developments will reshape how businesses adopt AI tools in 2025.',
});

// ── buildSummaryPrompt ────────────────────────────────────────────────────────

describe('buildSummaryPrompt', () => {
  it('includes topic and region', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    expect(prompt).toContain('Topic: AI');
    expect(prompt).toContain('Region: USA');
  });

  it('wraps articles in <articles> tags', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    expect(prompt).toContain('<articles>');
    expect(prompt).toContain('</articles>');
  });

  it('includes article titles and sources', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    expect(prompt).toContain('OpenAI releases GPT-5 — TechCrunch');
    expect(prompt).toContain('Google DeepMind unveils Gemini Ultra — Wired');
  });

  it('caps article list at 3 (MAX_ARTICLES_PER_CLUSTER)', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    // Fourth article should NOT appear
    expect(prompt).not.toContain('This fourth article should be truncated');
    // Exactly 3 numbered items
    expect(prompt).toContain('1.');
    expect(prompt).toContain('2.');
    expect(prompt).toContain('3.');
    expect(prompt).not.toContain('4.');
  });

  it('includes prompt injection warning', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    expect(prompt.toLowerCase()).toContain('untrusted');
  });

  it('specifies JSON-only output format', () => {
    const prompt = buildSummaryPrompt(SAMPLE_INPUT);
    expect(prompt).toContain('ONLY valid JSON');
    expect(prompt).toContain('headline');
    expect(prompt).toContain('insights');
    expect(prompt).toContain('impact');
  });
});

// ── parseSummaryResponse ──────────────────────────────────────────────────────

describe('parseSummaryResponse', () => {
  it('parses a valid JSON response', () => {
    const result = parseSummaryResponse(VALID_RESPONSE);
    expect(result).not.toBeNull();
    expect(result!.headline).toBe('AI industry races ahead with new model releases');
    expect(result!.insights).toHaveLength(3);
    expect(result!.impact).toContain('2025');
  });

  it('extracts JSON from a response with preamble text', () => {
    const withPreamble = `Sure, here is the summary:\n${VALID_RESPONSE}\nHope that helps!`;
    const result = parseSummaryResponse(withPreamble);
    expect(result).not.toBeNull();
    expect(result!.headline).toBeTruthy();
  });

  it('returns null for empty string', () => {
    expect(parseSummaryResponse('')).toBeNull();
  });

  it('returns null for non-JSON text', () => {
    expect(parseSummaryResponse('Sorry, I cannot help with that.')).toBeNull();
  });

  it('returns null when headline is missing', () => {
    const bad = JSON.stringify({ insights: ['a', 'b'], impact: 'Something' });
    expect(parseSummaryResponse(bad)).toBeNull();
  });

  it('returns null when insights array is empty', () => {
    const bad = JSON.stringify({ headline: 'Title', insights: [], impact: 'Something' });
    expect(parseSummaryResponse(bad)).toBeNull();
  });

  it('returns null when impact is missing', () => {
    const bad = JSON.stringify({ headline: 'Title', insights: ['a'] });
    expect(parseSummaryResponse(bad)).toBeNull();
  });

  it('filters non-string entries from insights array', () => {
    const mixed = JSON.stringify({
      headline: 'Title',
      insights: ['valid', 42, null, 'also valid'],
      impact: 'Something',
    });
    const result = parseSummaryResponse(mixed);
    expect(result).not.toBeNull();
    expect(result!.insights).toEqual(['valid', 'also valid']);
  });

  it('returns null for malformed JSON', () => {
    expect(parseSummaryResponse('{ headline: "broken json" ')).toBeNull();
  });
});

// ── summarizeClusters ─────────────────────────────────────────────────────────

function makeEnv(response: string): WorkerEnv {
  return {
    AI: {
      run: vi.fn().mockResolvedValue({ response }),
    },
  } as unknown as WorkerEnv;
}

describe('summarizeClusters', () => {
  it('returns empty array for empty input', async () => {
    const env = makeEnv(VALID_RESPONSE);
    const result = await summarizeClusters(env, []);
    expect(result).toEqual([]);
    expect(env.AI.run).not.toHaveBeenCalled();
  });

  it('returns one summary per input', async () => {
    const env = makeEnv(VALID_RESPONSE);
    const inputs: SummaryInput[] = [
      { ...SAMPLE_INPUT, clusterId: 'c1' },
      { ...SAMPLE_INPUT, clusterId: 'c2' },
    ];
    const results = await summarizeClusters(env, inputs);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.clusterId)).toContain('c1');
    expect(results.map((r) => r.clusterId)).toContain('c2');
  });

  it('populates headline/insights/impact on success', async () => {
    const env = makeEnv(VALID_RESPONSE);
    const [result] = await summarizeClusters(env, [SAMPLE_INPUT]);
    expect(result.headline).toBe('AI industry races ahead with new model releases');
    expect(result.insights).toHaveLength(3);
    expect(result.impact).toBeTruthy();
  });

  it('returns null fields when AI call throws', async () => {
    const env = {
      AI: { run: vi.fn().mockRejectedValue(new Error('AI timeout')) },
    } as unknown as WorkerEnv;
    const [result] = await summarizeClusters(env, [SAMPLE_INPUT]);
    expect(result.clusterId).toBe('cluster-1');
    expect(result.headline).toBeNull();
    expect(result.insights).toBeNull();
    expect(result.impact).toBeNull();
  });

  it('returns null fields when AI returns invalid JSON', async () => {
    const env = makeEnv('I cannot summarize this.');
    const [result] = await summarizeClusters(env, [SAMPLE_INPUT]);
    expect(result.headline).toBeNull();
  });

  it('partial failure does not affect other summaries', async () => {
    let callCount = 0;
    const env = {
      AI: {
        run: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.reject(new Error('fail'));
          return Promise.resolve({ response: VALID_RESPONSE });
        }),
      },
    } as unknown as WorkerEnv;

    const inputs: SummaryInput[] = [
      { ...SAMPLE_INPUT, clusterId: 'bad' },
      { ...SAMPLE_INPUT, clusterId: 'good' },
    ];
    const results = await summarizeClusters(env, inputs);
    const bad  = results.find((r) => r.clusterId === 'bad');
    const good = results.find((r) => r.clusterId === 'good');
    expect(bad!.headline).toBeNull();
    expect(good!.headline).toBeTruthy();
  });
});
