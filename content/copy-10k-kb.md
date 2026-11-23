# 10-K / 10-Q Research Knowledge Base (`/projects/10k-kb`)

## Executive Summary
A retrieval-augmented knowledge base and entity graph covering **973 SEC filings from 186 companies** (mostly 10-Ks, plus 44 10-Qs and some 20-Fs, filed 2022–2026). It is in daily use as part of a personal portfolio manager.

* **Scale:** 394,913 text chunks embedded with `Qwen3-Embedding-0.6B` in ChromaDB; 45,791 entities; 70,458 relationships; 40,910 LLM-extracted claims across 9 claim types.
* **Primary CTA:** `Launch Query Traces Demo` (`/demos/10k-kb`) · `View Public Pipeline Repo` (`[NEEDS FACT: public repo URL]`)

## Proof Layer
* **Interactive Query Traces:** Deterministic replays of real pipeline runs on an 8-company, 16-filing public sample, showing top-20 retrieved passages (including rejected candidates below the demo cutoff), raw Claude extraction JSON, and direct `sec.gov` links.
* **30-Second System Clip:** `[EMBED: 30s silent clip of the full 186-company / 973-filing FastAPI + React explorer]`

## Role & Ownership
I directed the system design, database schema, embedding-model choice, chunking strategy, and evaluation bar; AI coding agents wrote most of the code.

## Engineering & Operational Controls
* **Pipeline:** Section detection for 10-K/10-Q items; sentence-boundary chunking of long sections; Claude extraction into a closed vocabulary (9 claim types); identifier-first entity linking (ticker/CIK, then fuzzy name match) with a manual-review queue; time-decayed confidence.
* **Operational Controls:**
  * **Bitemporal versioning:** Prior versions are closed out, never deleted, so any query sees what was known at a given point in time.
  * **Section-level provenance:** Every chunk carries its source filing and section (e.g., *Item 1A Risk Factors*).
  * **Closed extraction vocabulary:** Restricts LLM output to defined entity and claim schemas.
  * **Manual-review queue:** Isolates ambiguous entity-linking matches instead of auto-merging.
* **Filing Signals (Shadow Mode Only):** Computes year-over-year tone shift (embedding drift between a section and the prior year's, motivated by the *Lazy Prices* paper), FinBERT sentiment shift, and an LLM claim-by-claim diff. Signals run in shadow mode and do not drive trades.

## Known Limits
* Filing signals run in shadow mode only and are switched off for trading.
* Corpus is mostly 10-Ks (44 10-Qs, some 20-Fs, no 8-Ks).
* Approximately 25,000 entity-resolution reviews remain open in the manual queue.
* Ingests ran as manual batches through mid-November 2026.
