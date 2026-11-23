# v2 Evaluation Designs (Methodology & Time Budget)

All four v2 evals are designed to keep Andrew's total manual labeling time under **~3 hours**.

## 1. Retrieval Recall@k
* **Metric:** `Recall@5` and `Recall@20` (fraction of gold-relevant `(ticker, fiscal_year, section)` targets appearing in top-k retrieved chunks).
* **Golden Set:** 30 questions across the 8-company sample (NVDA, AMD, INTC, BA, UNH, META, JPM, XOM). Each entry lists 1–3 expected `(ticker, fiscal_year, section, must_contain_phrase)` targets.
* **Labeling:** Andrew reviews/approves 30 question-target pairs (~45 min).
* **Proposed Pass Threshold:** `Recall@20 >= 0.85`, `Recall@5 >= 0.65`.

## 2. Citation Faithfulness
* **Metric:** Sentence-level faithfulness rate (% of cited claims strictly supported by their linked passage context, no unsupported numbers or extrapolations).
* **Golden Set:** All cited sentences from the 6–8 published traces (~60–90 sentences).
* **Calibration:** Run an LLM judge on 100% of cited sentences; Andrew manually labels a stratified 25-sentence spot-check (~30 min). Report Cohen's kappa ($\kappa$) between judge and human.
* **Proposed Pass Threshold:** Faithfulness `>= 0.95` on published traces; judge-human $\kappa \ge 0.80$.

## 3. 50-Claim Extraction Audit
* **Metric:** Claim precision (`TP / (TP + FP)`), false-positive rate, and error distribution across a 5-class failure taxonomy: `hallucinated`, `wrong_entity_link`, `wrong_fiscal_year`, `truncated_context`, `schema_misclassification`.
* **Golden Set:** 50 stratified claims sampled across the 9 claim types from the 8-company sample.
* **Worksheet & Time:** CSV/JSONL worksheet pre-populated with claim + source passage; Andrew marks `TP` or failure code (~60 min).
* **Proposed Pass Threshold:** Precision `>= 0.88`; `hallucinated` rate `< 0.02`.

## 4. Cost per 10-K Ingested
* **Metric:** Total USD, input/output tokens, and wall-clock seconds per 10-K, broken down by stage (`parse_chunk`, `embed`, `extract_claims`, `entity_link`, `signals`).
* **Logging:** Emit one structured JSONL record per filing run with `model`, `input_tokens`, `output_tokens`, `wall_seconds`, and `usd_cost` (computed from a versioned pricing table).
* **Reporting:** Median and p90 cost/time across the 16 sample 10-Ks (zero manual labeling time).
