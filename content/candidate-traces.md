# 12 Candidate Query Traces (FY2024 & FY2025 10-Ks)

Sample companies: **NVDA, AMD, INTC, BA, UNH, META, JPM, XOM**.

## Category 1: Risk Shifts (`risk_shift`)
1. **NVDA export-control and sovereign-AI risk evolution (FY24 → FY25)**
   * *Question:* How did NVIDIA's Item 1A export-control and customer-concentration risk disclosures shift between FY2024 and FY2025?
   * *Why non-obvious:* Requires section-level YoY claim diffing and tone-drift scoring across two full 10-Ks rather than summarizing a single filing.
   * *Data needed:* NVDA FY24 & FY25 Item 1A; `Risk` claims; YoY `tone_shift` + `claim_diff`.
2. **INTC foundry execution and capital-intensity risks (FY24 → FY25)**
   * *Question:* What new manufacturing, foundry-customer, or impairment risks did Intel add in FY2025 compared to FY2024?
   * *Why non-obvious:* Separates newly introduced risk claims from boilerplate carried over from FY2024.
   * *Data needed:* INTC FY24 & FY25 Item 1A & Item 7; `Risk`, `MaterialEvent` claims; `claim_diff`.
3. **UNH cybersecurity and regulatory-scrutiny shift (FY24 → FY25)**
   * *Question:* How did UnitedHealth Group's cybersecurity, operational-disruption, and regulatory risk language change from FY2024 to FY2025?
   * *Why non-obvious:* Connects post-incident risk-factor rewrites with legal-proceeding disclosures across two years.
   * *Data needed:* UNH FY24 & FY25 Item 1A & Item 3; `Risk`, `LegalProceeding` claims; `tone_shift` + `sentiment_shift`.

## Category 2: Contradictions (`contradiction`)
4. **META AI capex ambition vs. monetization uncertainty**
   * *Question:* Where do Meta's FY2025 MD&A statements on AI infrastructure investment sit in tension with its Item 1A monetization and return-on-investment risks?
   * *Why non-obvious:* Cross-section tension detection between optimistic Item 7 narrative and defensive Item 1A caveats.
   * *Data needed:* META FY25 Item 1A & Item 7; `GuidanceUpdate`, `Risk`, `CapitalStructureEvent` claims.
5. **BA production-ramp outlook vs. supplier/FAA constraints**
   * *Question:* What tensions exist in Boeing's FY2025 10-K between commercial delivery recovery commentary and disclosed regulatory or supply-chain constraints?
   * *Why non-obvious:* Pairs extracted forward-looking claims against explicit legal/operational constraints in separate sections.
   * *Data needed:* BA FY25 Item 1A, Item 3, Item 7; `MaterialEvent`, `Risk`, `LegalProceeding` claims.
6. **XOM low-carbon transition commitments vs. hydrocarbon capex priorities**
   * *Question:* How do ExxonMobil's stated emissions/low-carbon initiatives compare against its disclosed capital allocation and regulatory risk factors in FY2025?
   * *Why non-obvious:* Surfaces structured tensions between `ESGCommitment` entities and `CapitalStructureEvent` / `Risk` claims.
   * *Data needed:* XOM FY25 Item 1, Item 1A, Item 7; `ESGCommitment`, `Risk`, `CapitalStructureEvent` claims.

## Category 3: Capital Structure (`capital_structure`)
7. **BA liquidity, debt, and equity-raise actions (FY24 → FY25)**
   * *Question:* What debt issuances, credit-facility changes, or equity-raising actions did Boeing disclose across FY2024 and FY2025 to manage liquidity?
   * *Why non-obvious:* Aggregates structured `CapitalStructureEvent` claims across two fiscal years with exact section provenance.
   * *Data needed:* BA FY24 & FY25 Item 7 (Liquidity) & Note on Debt; `CapitalStructureEvent`, `MaterialEvent` claims.
8. **JPM capital-return and Basel/regulatory capital posture (FY24 → FY25)**
   * *Question:* How did JPMorgan Chase's buyback, dividend, and regulatory-capital buffer disclosures evolve between FY2024 and FY2025?
   * *Why non-obvious:* Links `CapitalReturn` actions to regulatory-capital risk constraints across two filings.
   * *Data needed:* JPM FY24 & FY25 Item 7 & Item 1A; `CapitalReturn`, `CapitalStructureEvent`, `Risk` claims.
9. **INTC dividend/buyback suspension and government-grant financing**
   * *Question:* How did Intel's capital-return posture and external funding sources (including CHIPS Act grants or joint ventures) shift between FY2024 and FY2025?
   * *Why non-obvious:* Tracks structural financing changes across both MD&A and footnotes without relying on memory.
   * *Data needed:* INTC FY24 & FY25 Item 7 & Footnotes; `CapitalStructureEvent`, `CapitalReturn` claims.

## Category 4: Cross-Company (`cross_company`)
10. **NVDA vs. AMD vs. INTC: Foundry and packaging dependency**
    * *Question:* How do NVIDIA, AMD, and Intel differ in how they describe third-party foundry and advanced-packaging concentration risk in FY2025?
    * *Why non-obvious:* Multi-company entity-graph comparison across 3 separate 10-Ks simultaneously.
    * *Data needed:* NVDA, AMD, INTC FY25 Item 1A; `Risk`, `Company` entities and relationships.
11. **META vs. NVDA: AI infrastructure spend from buyer and supplier perspectives**
    * *Question:* How do Meta's FY2025 AI capex and depreciation disclosures compare with NVIDIA's disclosures on hyperscaler customer concentration?
    * *Why non-obvious:* Cross-references two sides of the same value chain using extracted claims from two different companies' filings.
    * *Data needed:* META & NVDA FY25 Item 1A & Item 7; `CapitalStructureEvent`, `Risk`, `RevenueSegment` claims.
12. **JPM vs. UNH: AI adoption and cybersecurity governance**
    * *Question:* How do JPMorgan Chase and UnitedHealth Group contrast in their FY2025 disclosures around AI operational risk and cybersecurity governance?
    * *Why non-obvious:* Cross-sector comparison across financial and healthcare regulatory regimes.
    * *Data needed:* JPM & UNH FY25 Item 1A & Item 1C (Cybersecurity); `Risk`, `LegalProceeding` claims.
