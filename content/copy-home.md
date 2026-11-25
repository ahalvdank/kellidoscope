---
title: Andrew Kell | Auditable AI decision systems
description: "Kellogg MBA (Dec 2026). A 10-K research knowledge base, a venture diligence platform and a portfolio manager: how each one works and, where it was tested, the results."
hero:
  headline: I design and ship AI systems for financial research, venture diligence, and investing.
  subhead: Kellogg MBA (Dec 2026). I design, direct and evaluate AI systems, from an SEC-filings knowledge base to a multi-agent venture diligence platform.
  cta:
    label: Inspect 10-K Query Traces
    href: /demos/10k-kb
flagships:
  - name: 10-K / 10-Q research knowledge base
    metric: 973 filings · 186 companies
    summary: Retrieval and a knowledge graph over 973 SEC filings from 186 companies, with bitemporal versioning and the source filing and section on every chunk.
    status: In daily use, as part of my portfolio manager.
    links:
      - label: Inspect the query traces
        href: /demos/10k-kb
      - label: Case study
        href: /projects/10k-kb
  - name: Beckett deal-diligence platform
    metric: ~60h → ~25h per deal
    summary: A multi-agent diligence platform for an early-stage CPG venture fund. Average diligence time fell from about 60 hours per deal to about 25, on a small sample of 4 deals before and 4 after.
    status: Still the fund's standard diligence process.
    links:
      - label: Case study
        href: /projects/beckett-diligence
  - name: Portfolio manager
    metric: Daily use since spring 2025
    summary: Gradient-boosted tree ensembles, market-regime models and a committee of specialist agents. Every trade recommendation needs human approval.
    status: In daily use, running since spring 2025.
    links:
      - label: Case study
        href: /projects/portfolio-manager
personal:
  heading: Wine apps
  role: On these, as on the knowledge base and the portfolio manager, I was the architect, product manager and engineering team lead; AI coding agents worked like my staff engineers and wrote most of the code.
  cards:
    - name: Blind-tasting game
      preview: blindTastingPreview
      previewAlt: Screenshot of the blind-tasting game
      summary: "A phone-motion practice round for the Wine Professional Level III deductive tasting exam: swirl, nose and sip a simulated glass, fill in the tasting sheet, and get a 25-point scored report."
      links:
        - label: Play it
          href: blindTastingApp
        - label: Code
          href: blindTastingRepo
          event: repo
    - name: Wine journal
      preview: cellarPreview
      previewAlt: Screenshot of the wine journal
      summary: A journal of my own tastings with stock tracking, a 3D cellar of photo-labelled bottles and an atlas of wine regions.
      links:
        - label: Open the demo collection
          href: cellarApp
    - name: Class tasting
      preview: classTastingPreview
      previewAlt: Screenshot of the class-tasting sheet
      summary: "A shared tasting sheet for a wine class: the instructor reveals each wine, every student's Wine Professional 25-point sheet is scored against the answer key, each student sees why they gained or lost each point, and the class sees an anonymous comparison. Students can never read the answer key."
      status: Built for a Level III class; first pilot not yet run.
      links:
        - label: See how it works
          href: classTastingApp
---
