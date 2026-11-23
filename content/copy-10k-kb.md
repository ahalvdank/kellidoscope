---
title: 10-K / 10-Q research knowledge base | Andrew Kell
description: A retrieval and knowledge-graph system over 973 SEC filings from 186 companies, in daily use. Replayable query traces from a public 61-filing sample, with the evals and limits.
---

I was the architect, product manager and engineering team lead; AI coding agents worked like my staff engineers and wrote most of the code.

A knowledge base and entity graph over 973 SEC filings from 186 companies: mostly 10-Ks, plus 44 10-Qs and some 20-Fs, filed 2022–2026. It is in daily use as part of my portfolio manager.

- 394,913 text chunks, embedded with Qwen3-Embedding-0.6B and stored in ChromaDB
- 45,791 entities and 70,458 relationships
- 40,910 claims extracted by an LLM into 9 claim types, including risks, material events, capital structure, legal proceedings and guidance

## Query traces

The traces come from a public rewrite of the pipeline, run on a sample of 61 filings: 12 companies, five fiscal years each, plus one 10-K/A.

For each question, retrieval takes the top 20 chunks per filing and section. Passages that score under a display cutoff of 0.35 are not shown to the model. The rest, up to 40, go to `claude-sonnet-4-6`, which answers in single sentences, each one citing the passages behind it. A trace shows that answer, every passage with its score and SEC link, up to 10 of the best rejected candidates (some traces have none), and the claims behind it.

Thirteen questions were run. A UNH question passed the automated checks but failed my own review on three weak sentences, so it was dropped. Twelve are exported, and eight of those are featured in the demo.

## How the private pipeline works

- Section detection for 10-K and 10-Q items, then sentence-boundary chunking of long sections.
- Claude extraction into a closed vocabulary of claim and entity types.
- Identifier-first entity linking: ticker or CIK first, then a fuzzy name match. Ambiguous matches go to a manual-review queue.
- Time-decayed confidence on extracted facts.
- A query layer with semantic vector search, graph and SQL lookups and traversal, a read-only FastAPI and React explorer, and agent skills that query it.

### Operational controls

- **Bitemporal versioning.** Prior versions are closed out, never deleted, so a query sees what was known at that time.
- **Provenance on every chunk.** Each chunk carries its filing and section, for example *Item 1A Risk Factors*.
- **Closed extraction vocabulary.** Extraction is limited to a fixed set of claim and entity types.
- **Manual-review queue.** Ambiguous entity matches go to a queue for a person to review.

## Filing signals (shadow mode only)

Three signals compare a filing with the prior year's: tone shift (embedding drift between a section and the same section a year earlier), FinBERT sentiment shift, and an LLM claim-by-claim diff between the two filings. The tone-shift idea comes from the *Lazy Prices* paper. That paper is the motivation only; I did not replicate it and make no claim about returns.

The signals run in shadow mode. They are computed but switched off for trading, so the knowledge base does not drive trades.

FinBERT reads at most 512 tokens. In the public sample, 747 of the 2,898 chunks scored (25.8%) were longer and were truncated, so their sentiment reflects only their first 512 tokens.

## The public rewrite

The public repository is a rewrite of the private pipeline: the code is rewritten, not copied. Two things come over unchanged, the v3 extraction prompt and the extractions it produced, which are committed. `make traces-from-cache` rebuilds every trace from the committed answers with no API key and no network. `make sample-refresh` re-runs extraction live, with your own API key and at your cost.

## Known limits

**Private system**

- Filing signals run in shadow mode only.
- The corpus is mostly 10-Ks: 44 10-Qs, some 20-Fs and no 8-Ks.
- About 25,000 entity-resolution reviews are still open.
- Ingests ran as manual batches through mid-November 2026.

**Public sample**

- **Sample size.** 12 companies, 61 filings and 12 traces, one run and one model each. They show how the pipeline works; they don't evaluate it.
- **Fidelity coverage.** The section-text fidelity check covers 682 of 824 sections. Sections the private pipeline split, and sections the public detector did not find, are not in it.
- **Sentiment truncation.** FinBERT truncated 747 of the 2,898 chunks it scored (25.8%). 4 of the 96 signal rows have no sentiment or tone value.
- **Same-day amendment.** AMD filed its FY2025 10-K and 10-K/A on the same day (2026-02-04), so a date-based point-in-time query can't show the 17 superseded claims. The AMD trace shows them from their close-out record instead.
- **Missing MD&A.** No Item 7 is detected in Intel's 10-Ks, and CVX, JPM and XOM incorporate theirs by reference, so the questions avoid Item 7 for those four companies.
- **Table figures.** A number that a cited passage holds only as a bare table cell is checked by a person, not by code. 8 of the 144 numbers in the 12 answers are on that audit list.
- **Reproducing extractions.** The committed extractions come from the private pipeline. A new model run will not reproduce them exactly.
