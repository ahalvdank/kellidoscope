# Beckett Deal-Diligence Platform (`/projects/beckett-diligence`)

> *All deal data, company names and fund figures omitted.*

## Executive Summary
An agentic diligence platform for an early-stage CPG venture fund, currently used as the fund's standard diligence process. Across a small sample (4 deals before vs. 4 deals after), average diligence time fell from about **60 hours per deal to about 25 hours** (~58% reduction).

## Role & Ownership
I designed, directed, and approved the platform—setting the architecture, agent flow, database schema, embedding-model choice, chunking strategy, repo/branching workflow, and evaluation protocol, while inspecting pull requests and serving as the final judge of quality on financial models and memos.

## Architecture & Engineering
* **Knowledge Base:** Combines prior deal data, licensed market data and industry research, and the target company's own documents.
* **Two-Layer Retrieval:** Structured fact tables (SQL/JSON) paired with a `pgvector` database of chunked embeddings. Uses parent-child chunking: retrieve small chunks, return the full parent passage. Chunks split on headings and chapters (~500–700 tokens), keeping whole tables intact as single chunks.
* **Table Parsing & Provenance:** A dedicated parser extracts tables before embedding and structures them into SQL/JSON as a fact basis for drafting and review agents. Every chunk and fact carries its source, page, document name, date, and exact original wording.
* **Multi-Agent Flow:**
  * **Specialists:** Valuation/model builders, section-owning drafting agents, judge agents, and critics.
  * **Committee:** Reviews the full package with distinct roles (adversarial reviewer, associate, partner, and others).
  * **Custom Python Orchestrator:** Built without an agent framework; writes its reasoning out separately so it can be audited independently of the final output.
  * **Retrospective Agent:** Reviews orchestrator reasoning and writes lessons into persistent memory for subsequent diligences.
* **Reliability & Model Flexibility:** Stages are idempotent and resumable. The harness is model- and provider-agnostic (OpenAI, Anthropic, or local models assignable per role).

## Evaluation & Empirical Choices
* **Development Benchmark (Not a Held-Out Test):** My 4 hand-written diligence reports served as the benchmark—generate, compare against the hand-written work, tune, and repeat on the next report and model.
* **Embedding Experiment:** In internal tests, OpenAI `text-embedding-3-large` was not meaningfully better than `text-embedding-3-small`, so we selected `small` (~6× cheaper).
