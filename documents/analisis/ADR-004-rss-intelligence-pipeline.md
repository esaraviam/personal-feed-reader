# ADR-004: RSS Intelligence Pipeline Architecture

## Status
Accepted

## Context

The product goal is to transform Daily Brief from a traditional RSS reader into an AI-powered **information intelligence system** — one that deduplicates semantically similar articles, clusters related news stories, classifies topics and regions, ranks by multi-signal scoring, and generates LLM summaries per cluster into a structured daily digest.

A formal spec (`specs/rss_intelligence_spec.md`) defines an 8-stage pipeline:

```
RSS Feeds → Normalizer → Deduplicator → Classifier → Clusterer → Ranker → Summarizer → Daily Digest
```

A feasibility analysis of the spec against the current codebase revealed two key constraints:

1. **Architecture mismatch**: The spec assumes a server-side processing pipeline. The current app is a pure client-side PWA with no backend beyond a Cloudflare CORS proxy Worker.
2. **AI requirements**: Semantic deduplication and clustering require vector embeddings. LLM summarization requires a capable language model. Neither is viable at acceptable quality in-browser without external infrastructure.

**Current implementation coverage (~30% of spec):**

| Stage | Current State |
|---|---|
| Ingestion + Normalization | ✅ `aggregator.ts` — full RSS/Atom/RDF parser |
| Deduplication | 🟡 ID-based only — no semantic similarity |
| Classification | ❌ None |
| Clustering | ❌ None |
| Ranking | 🟡 `ranking.ts` — keyword + recency + source priority |
| Summarization | ❌ None |
| Digest UI | 🟡 `HomeView` — flat ranked list, no cluster structure |
| Background automation | ❌ Manual refresh on app open only |

Three architectural paths were evaluated to close this gap.

## Decision

**Implement the intelligence pipeline using Path B: Extend the existing Cloudflare Worker into a processing backend.**

The PWA remains the presentation layer. A CF Worker handles all AI processing and exposes a pre-built digest endpoint consumed by the frontend.

## Options Considered

### Option A: Client-Side Intelligence (Pure PWA, No Backend)

Replace embedding-based algorithms with cheaper text approximations executable in-browser:
- Jaccard similarity on title n-grams for deduplication
- Keyword taxonomy (rule-based) for classification
- TF-IDF bag-of-words + K-means for clustering
- LLM summarization via user-provided API key stored in `localStorage`

**Pros:**
- Zero infrastructure changes
- Fully offline-capable
- No operational overhead

**Cons:**
- Meaningfully lower quality on dedup and clustering (no semantic understanding)
- API key exposed in browser — security concern
- No true background refresh on iOS (Background Sync not supported by iOS Safari)
- Summarization cost borne entirely by the user with no rate limiting

---

### Option B: Extend the Cloudflare Worker *(selected)*

Promote the existing CF CORS proxy Worker into a full processing pipeline using Cloudflare's native AI and data primitives:

| CF Primitive | Role |
|---|---|
| **Cron Triggers** | Scheduled RSS fetch every 30 min + daily digest |
| **Workers AI** (`bge-small-en-v1.5`) | Embedding generation for dedup + clustering |
| **Workers AI** (`llama-3.1-8b-instruct`) | LLM cluster summarization |
| **D1** (hosted SQLite) | Persistent article + cluster + digest storage |
| **REST endpoint** `GET /digest` | Pre-processed digest delivered to PWA |

The PWA fetches the digest from the Worker endpoint, caches it via the Service Worker, and renders the cluster-based digest view.

**Pros:**
- Natural extension of the existing CF Worker — no new infrastructure vendor
- CF Workers AI free tier covers this workload (1M embedding tokens/day, 10K LLM tokens/day)
- True background scheduling via Cron Triggers (no PWA limitations)
- No API key exposure — all AI calls happen server-side in the Worker
- D1 is managed SQLite — zero ops, included in CF free tier

**Cons:**
- Backend logic to maintain (albeit minimal — ~500 lines of Worker code)
- CF Workers AI LLM quality is adequate but below GPT-4 / Claude 3.5 Sonnet
- PWA loses pure offline capability for new content (digest requires network fetch)
- Tight coupling to Cloudflare ecosystem

---

### Option C: Full Node.js + SQLite Backend (Spec as Written)

Deploy a dedicated Node.js server with the full pipeline: HDBSCAN clustering, OpenAI embeddings, GPT-4 summarization, PostgreSQL or SQLite storage.

**Pros:**
- Highest quality (best embedding models, best LLMs)
- Spec-compliant architecture
- Full control over every component

**Cons:**
- Requires a VPS or container hosting — ongoing cost and operational maintenance
- HDBSCAN has no mature production-grade JS library; Python sidecar needed for quality
- Significant over-engineering for a personal RSS reader
- No practical advantage over Path B for this scale

## Rationale

Path B was chosen over Path A and Path C for these reasons:

1. **Infrastructure already exists**: The CF Worker is deployed and serving production traffic. Extending it requires no new vendor relationships, no new deployment pipelines, and no new secrets management.
2. **Free tier is sufficient**: At personal-reader scale (~10–50 feeds, ~200–500 articles/day), CF Workers AI embedding and LLM usage is well within the free tier limits.
3. **Background scheduling is real**: Cron Triggers fire reliably regardless of whether the PWA is open — solving the core limitation of the pure client approach.
4. **Security**: API keys and model calls remain server-side. No user credential exposure.
5. **Reversibility**: If CF Workers AI quality proves insufficient, the Worker can be updated to call OpenAI/Anthropic with a server-side key without changing the PWA at all.

Path A was rejected primarily because semantic deduplication quality is critical to the product goal (signal over noise) and Jaccard similarity on titles is not adequate for cross-source coverage of the same story.

Path C was rejected as over-engineered for the problem scale and the team size (solo developer).

## Implementation Plan

Phased delivery, each phase independently shippable:

### Phase 1 — Ingestion + Storage Foundation
- Extend CF Worker with D1 database schema: `articles`, `clusters`, `digests` tables
- Move RSS fetching into Worker with Cron Trigger (30 min interval)
- Persist normalized articles to D1
- PWA continues to work with current refresh flow during transition

### Phase 2 — Semantic Deduplication + Classification
- Add embedding generation via `@cf/baai/bge-small-en-v1.5` per article title
- Implement cosine similarity dedup (threshold: 0.90)
- Add rule-based classifier for topics + region detection (keyword taxonomy)
- Store `topics`, `region`, `importance` on article records

### Phase 3 — Clustering + Ranking Upgrade
- Group articles by embedding similarity using K-means (k determined by article count)
- Add `cluster_size` signal to ranking formula:
  ```
  score = (topic_match × 0.4) + (source_quality × 0.2) + (recency × 0.2) + (cluster_size × 0.2)
  ```
- Expose clusters via `GET /digest` endpoint

### Phase 4 — LLM Summarization
- For each cluster with ≥ 2 articles, generate summary via `@cf/meta/llama-3.1-8b-instruct`:
  - 1 sentence headline
  - 2 bullet key insights
  - 1 impact statement
- Cache summaries in D1 — regenerate only when cluster composition changes

### Phase 5 — Digest UI Redesign
- Replace flat article list in `HomeView` with cluster-based digest
- Topic-grouped sections with per-cluster summaries
- "Signal Mode" toggle — show only clusters with ≥ 2 sources + high importance score
- Mark-as-read at cluster level

## Data Flow After Implementation

```
CF Cron (30min)
  └── Fetch RSS feeds
  └── Normalize → D1 articles
  └── Generate embeddings (Workers AI)
  └── Deduplicate (cosine similarity)
  └── Classify (topic + region + importance)
  └── Cluster (K-means on embeddings)
  └── Rank (multi-signal formula)

CF Cron (daily)
  └── Summarize clusters (Workers AI LLM)
  └── Build digest → D1 digests

PWA
  └── GET /digest → fetch pre-built digest
  └── Service Worker caches digest for offline
  └── DigestView renders cluster-based UI
```

## Consequences

**Positive:**
- Meaningfully higher signal-to-noise ratio in the daily brief
- Background processing decoupled from app being open
- API costs zero (CF free tier)
- Digest available offline after first load (Service Worker cache)

**Negative:**
- New content requires network fetch — pure offline experience degraded for fresh digests
- CF Workers AI LLM summaries will be lower quality than GPT-4/Claude; may require prompt tuning
- D1 schema migrations require careful management as pipeline evolves
- Tight coupling to Cloudflare — migration away from CF would require significant rework

## Accepted Limitations

| Limitation | Mitigation |
|---|---|
| LLM quality below OpenAI/Anthropic | Prompt engineering + fallback to extractive summary if generation is poor |
| No true offline for new content | Cached digest remains available; staleness indicator in UI |
| K-means requires fixed k | Use `k = ceil(sqrt(n/2))` heuristic; evaluate HDBSCAN if K-means clustering quality is poor |
| Workers AI token limits | At personal scale, well within free tier; add monitoring if feeds grow significantly |

## Re-evaluation Triggers

This decision should be revisited if any of the following occur:

| Trigger | Likely Response |
|---|---|
| CF Workers AI free tier exceeded | Add OpenAI/Anthropic key to CF Worker secrets (no PWA changes) |
| LLM summary quality unacceptable after prompt tuning | Upgrade to Claude Haiku or GPT-4o-mini via CF Worker (no PWA changes) |
| Clustering quality poor on K-means | Migrate to HDBSCAN via Python sidecar or CF Vectorize |
| CF platform reliability issues | Migrate Worker logic to a dedicated Node.js service |

## References

- `specs/rss_intelligence_spec.md` — original intelligence pipeline specification
- [ADR-002](./ADR-002-stay-with-pwa.md) — decision to stay with PWA
- [ADR-003](./ADR-003-pwa-native-quality-enhancements.md) — PWA quality improvements
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) — embedding and LLM models
- [Cloudflare D1](https://developers.cloudflare.com/d1/) — serverless SQLite
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
