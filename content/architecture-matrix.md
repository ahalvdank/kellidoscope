---
title: Why not a simpler solution?
description: Six ways to research a filing corpus, compared, with every cell tagged by how much evidence stands behind it.
---

## Why not a simpler solution?

Every cell is tagged. **Measured** means counted or tested in my system. **Design rationale** is a reasoned argument I have not tested. **Not tested** means exactly that.

| Approach | Cross-company and multi-year questions | Extraction quality | Provenance and auditability | Cost and latency at 973 filings | Where it wins |
|---|---|---|---|---|---|
| **1. Human analyst only** | High judgment, slow across 186 companies *(Design rationale)* | The reference standard for judgment, but it does not scale to a corpus *(Design rationale)* | A full audit trail, if the notes are kept *(Design rationale)* | Prohibitive for routine sweeps across the corpus *(Design rationale)* | Deep judgment on one or two high-conviction names *(Design rationale)* |
| **2. Keyword or lexicon search** | Fast exact matches; misses paraphrased risks *(Design rationale)* | None: it finds strings, not claims *(Design rationale)* | Exact string offsets *(Design rationale)* | Near zero *(Design rationale)* | Known ticker, statute or covenant lookups *(Design rationale)* |
| **3. FinBERT sentiment only** | Fast section-level scoring *(Design rationale)* | None: a score per chunk, no claims *(Design rationale)* | Section level only, with no claim-level explanation *(Design rationale)* | Very low *(Design rationale)* | A cheap directional screen; here it runs only as a shadow signal *(Design rationale)* |
| **4. Generic LLM with basic RAG** | Retrieves top-k chunks; weak on multi-hop entity links and point-in-time state *(Design rationale)* | With open 7B–70B models as the extractor, the best reached about 48% recall on high-yield sections, and one hallucinated facts *(Measured, open models only)* | Chunk-level provenance, if it is enforced *(Design rationale)* | Moderate *(Not tested)* | Fast Q&A over a small, fixed set of documents *(Design rationale)* |
| **5. Long-context frontier LLM with prompt caching** | Strong within one to three filings *(Design rationale)*; across 973 filings it runs into context and cost limits *(Not tested at full corpus)* | *(Not tested)* | Quotes need checking afterwards to confirm they weren't paraphrased *(Design rationale)* | Expensive to re-read 186 companies' filings for every question *(Not tested)* | **Wins outright for ad-hoc deep dives into one or two filings**, where building an index isn't worth the setup *(Design rationale)* |
| **6. Hybrid RAG with a bitemporal graph (this system)** | Semantic search (Qwen3-Embedding-0.6B) plus SQL and graph traversal over 45,791 entities and 40,910 claims *(Measured: counts)*; retrieval quality is a planned v2 eval *(Not tested)* | Claude Sonnet 4.6 kept over Sonnet 5 after a 119-section A/B in which Sonnet 5 found 84% fewer company entities *(Measured)* | Bitemporal versioning, the filing and section on all 394,913 chunks, and a manual-review queue *(Measured)* | Upfront extraction cost of about $0.300 per section *(Measured)*; per-query cost *(Not tested)* | Repeatable cross-company questions, year-over-year diffs and point-in-time research that can be audited *(Design rationale)* |

FinBERT reads at most 512 tokens. In the public sample it truncated 747 of the 2,898 chunks it scored (25.8%), so a long chunk's sentiment reflects only its opening.
