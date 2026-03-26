# RSS Intelligence Pipeline -- Spec for Claude

## Objective

Transform a traditional RSS reader into an AI-powered **information
intelligence system** that extracts high-signal insights from noisy news
feeds.

------------------------------------------------------------------------

## High-Level Architecture

    [RSS Feeds]
       ↓
    [Normalizer]
       ↓
    [Deduplicator]
       ↓
    [Classifier]
       ↓
    [Clusterer]
       ↓
    [Ranker]
       ↓
    [Summarizer]
       ↓
    [Daily Digest / UI]

------------------------------------------------------------------------

## 1. Ingestion Layer

### Responsibilities

-   Fetch RSS feeds periodically
-   Normalize structure

### Output Schema

``` json
{
  "title": "",
  "content": "",
  "source": "",
  "publishedAt": "",
  "url": ""
}
```

------------------------------------------------------------------------

## 2. Deduplication

### Strategy

-   Generate embeddings per article
-   Compute cosine similarity
-   Threshold: 0.9

### Pseudocode

``` ts
if (cosineSimilarity(a, b) > 0.9) {
  markAsDuplicate()
}
```

------------------------------------------------------------------------

## 3. Classification

### Goals

-   Assign topics
-   Detect region
-   Estimate importance

### Example Output

``` json
{
  "topics": ["AI", "Tech"],
  "region": "Global",
  "importance": 0.78
}
```

------------------------------------------------------------------------

## 4. Clustering

### Strategy

-   Group articles by semantic similarity
-   Algorithms:
    -   HDBSCAN (preferred)
    -   K-means (fallback)

### Output

    Cluster:
    - Article A
    - Article B
    - Article C

------------------------------------------------------------------------

## 5. Ranking

### Scoring Formula

    score =
      (topic_match * 0.4) +
      (source_quality * 0.2) +
      (recency * 0.2) +
      (cluster_size * 0.2)

------------------------------------------------------------------------

## 6. Summarization

### Prompt Template

    Summarize this cluster into:
    - 1 sentence headline
    - 2 bullet key insights
    - 1 impact statement

### Output Format

    Headline
    - Insight 1
    - Insight 2
    Impact

------------------------------------------------------------------------

## 7. Daily Digest

### Structure

    📅 Daily Brief

    🇨🇱 Chile
    - News summary

    💻 Tech
    - News summary

    🧠 AI
    - News summary

------------------------------------------------------------------------

## 8. UI/UX Requirements

### Must Have

-   Cluster-based navigation
-   Topic filtering
-   Digest view (default)
-   Mark-as-read by cluster

### Avoid

-   Infinite scroll
-   Source-first navigation

------------------------------------------------------------------------

## 9. Automation

### Jobs

-   RSS fetch: every 30 min
-   Processing: batch pipeline
-   Digest generation: daily

------------------------------------------------------------------------

## 10. Tech Stack

### Backend

-   Node.js + TypeScript
-   SQLite

### AI

-   Embeddings (OpenAI or local)
-   LLM for summarization

### Frontend

-   React
-   Dashboard + briefing UI

------------------------------------------------------------------------

## 11. Differentiator Feature

### Signal Mode

Only show: - High-impact news - Multi-source clusters - Emerging trends

------------------------------------------------------------------------

## Final Goal

    RSS → AI Pipeline → Clusters → Summaries → Daily Brief

Build a system that maximizes **signal over noise**.
