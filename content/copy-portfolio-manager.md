# Portfolio Manager (`/projects/portfolio-manager`)

> *Personal research project; not investment advice.*

## Executive Summary
A personal quantitative research and portfolio-management system in daily use, combining classic machine learning ensembles, market-regime models, and a multi-agent committee. Every trade recommendation requires explicit human approval over Telegram.

* **Trading Mode:** `[NEEDS FACT: live or paper trading]`
* **Operating History:** `[NEEDS FACT: how long it has run]`

## Role & Ownership
I directed the system design, model-promotion gates, and quality bar; AI coding agents wrote most of the code.

## System Architecture
* **Classic ML Layer:** Gradient-boosted tree ensembles (LightGBM, XGBoost, CatBoost), Random Forest, LSTM/transformer models, and Hidden Markov Model (HMM) market-regime models. Models must pass promotion gates before use.
* **Agent Committee:** Six specialist agents—fundamentals, valuation, macro, catalyst, devil's-advocate, and knowledge-base—feeding an aggregator.
* **Tax-Aware Execution & Human Gate:** Accounts for holding periods, tax lots, and loss harvesting. Every recommendation routes to Telegram for manual human approval before action.
* **Stack:** Python, FastAPI, n8n workflows, and a 25-page React dashboard.
