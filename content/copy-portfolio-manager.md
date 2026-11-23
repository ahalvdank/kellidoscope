---
title: Portfolio manager | Andrew Kell
description: A personal research and portfolio-management system, in daily use and running since spring 2025. It combines classic ML, market-regime models and an agent committee. Every trade recommendation needs human approval.
disclaimer: Personal research project; not investment advice.
---

I was the architect, product manager and engineering team lead; AI coding agents worked like my staff engineers and wrote most of the code.

A personal research and portfolio-management system, in daily use. It has been running since spring 2025, with new features added continuously. It trades some live money; new features run first in paper trading / shadow mode before they touch live money.

## How it works

- **Classic ML.** Gradient-boosted tree ensembles (LightGBM, XGBoost, CatBoost) plus random forest, LSTM and transformer models, and hidden Markov models for market regimes. A model has to pass promotion gates before it is used.
- **Agent committee.** Fundamentals, valuation, macro, catalyst, devil's-advocate and knowledge-base specialist agents, plus an aggregator.
- **Filing signals stay out of trading.** The 10-K knowledge base's filing signals run in shadow mode and do not drive trades.
- **Human approval.** Every trade recommendation needs human approval, given over Telegram.
- **Tax-aware.** It accounts for holding periods, tax lots and loss harvesting.
- **Stack.** Python, FastAPI, n8n workflows and a 25-page React dashboard.

## What this page leaves out

No holdings, positions, returns or account values are shown here.
