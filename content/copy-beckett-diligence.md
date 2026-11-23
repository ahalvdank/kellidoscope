---
title: Beckett deal-diligence platform | Andrew Kell
description: An agentic diligence platform for an early-stage CPG venture fund, still its standard diligence process. Average diligence time fell from about 60 hours per deal to about 25.
disclaimer: All deal data, company names and fund figures omitted.
---

An agentic diligence platform for an early-stage CPG venture fund. It is still the fund's standard diligence process. Average diligence time fell from about 60 hours per deal to about 25, roughly 58% less. The sample is small: 4 deals before and 4 after.

## My role

I designed, directed and approved the platform. I set the direction, designed the system and the agent flow, inspected the work, approved the pull requests, and was the final judge of quality on the financial models and memos. The technical decisions that were mine: the database schema, the embedding model, the chunking strategy, the repo and branching workflow, and the evaluation protocol.

## How it works

- **Knowledge base.** Prior deal data, licensed market data and industry research, and the target company's own documents.
- **Two-layer retrieval.** Structured fact tables that can be queried like a database, plus a pgvector database of chunked embeddings for semantic matching. Retrieval uses parent-child chunking: it finds small chunks and returns the full parent passage. Chunks are split by headings and chapters, a whole table stays in one chunk, and the target size is about 500–700 tokens.
- **Tables.** A parser pulls tables out before embedding, and their data is also structured into SQL and JSON. That fact basis is what review agents check against and what drafting agents work from.
- **Provenance.** Every chunk and every fact carries its source, page, document name, date and exact original wording.

### Agents

- **Specialists:** valuation and model builders, drafting agents that each own one memo section, judge agents, and critics.
- **A committee** that reviews the full package, with distinct roles: an adversarial reviewer, an associate, a partner and others.
- **One orchestrator,** in custom Python rather than an agent framework. It writes its reasoning out separately, so the reasoning can be reviewed independently of the result.
- **A retrospective agent** that reviews that reasoning and writes lessons into persistent memory for the next diligence.

### Engineering

Stages are idempotent and resumable. The harness is model- and provider-agnostic: OpenAI, Anthropic or local models, assignable per role.

## Evaluation

- **Development benchmark, not a held-out test.** My 4 hand-written diligence reports were the benchmark. The loop was to generate a report, compare it against mine, tune, and repeat on the next report and model.
- **Embedding choice by experiment.** In my tests, OpenAI text-embedding-3-large was not meaningfully better than text-embedding-3-small, so I selected small, which is about 6× cheaper.
