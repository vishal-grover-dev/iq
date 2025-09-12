# Intelliqent Questions (IQ) - Product Requirements Document

## Project Overview

**Project Title:** Intelliqent Questions (IQ)  
**Product Type:** B2C interview-prep platform with AI-generated, source-grounded MCQs

## Product Summary

IQ helps software professionals practice for interviews using high‑quality multiple‑choice questions generated from authoritative web documentation and tagged by difficulty and Bloom's taxonomy. The system ingests and indexes permissive sources (e.g., MDN for JavaScript, official React docs, TypeScript Handbook), generates and validates MCQs with citations, and adapts practice sets to a candidate’s weak areas.

Initial scope focuses on React (v1) with a fast follow to JavaScript, TypeScript, HTML, and CSS.

## Target Market

- **Primary:** India‑based software professionals preparing for interviews (early‑career to mid‑level)
- **Secondary:** Global learners seeking focused, versioned practice for React/JS/TS/HTML/CSS

## Core Features

### 1) Web Ingestion & Organization

- **Seeded crawl:** Admin provides seed URL(s) and domain/prefix rules (e.g., MDN JavaScript Guide). System crawls within constraints, respecting robots.txt and rate limits.
- **Extraction & normalization:** Parse main content (titles, headings, prose, code blocks). Normalize, de‑duplicate, and chunk (1–2k chars, 10–15% overlap).
- **Embeddings:** Create 1024‑d embeddings (Hugging Face) and store in `document_chunks` for retrieval.
- **Categorization:** Assign labels per document/chunk: `{ topic, area, subtopic, version }` (e.g., topic: JavaScript, area: Async, subtopic: Promises, version: ES6+). Derive from URL structure and breadcrumbs; maintain synonym rules.

### 2) AI‑Generated MCQs with Labels and Citations

- **RAG prompts:** Retrieve top‑k chunks by filters (topic/subtopic/version) and generate MCQs with fields: `question`, `options[4]`, `correctIndex`, `explanation`, `citations` (URLs/sections).
- **Difficulty labels:** Easy/Medium/Hard (author intent + auto‑calibration from aggregate correctness over time).
- **Bloom levels:** Remember, Understand, Apply, Analyze, Evaluate, Create.
- **Quality guardrails:** Reject/regenerate if missing citations, leaking trivia, or mislabeled Bloom/difficulty.

### 3) Practice Experience & Adaptive Drills

- **Timed quizzes:** Filter by topic/subtopic, difficulty, Bloom, and version tags.
- **Adaptive weak‑area drills:** Auto 10‑Q drills targeting weakest subtopics and Bloom levels using a simple score: `0.7×errorRate + 0.3×timeZScore` with progressive difficulty escalation.
- **No‑repeat policy:** Avoid repeats until ≥85% of the bank is consumed for chosen filters.
- **Analytics:** Topic/Bloom accuracy, time per item, difficulty curve, and personalized next‑steps.

### 4) Access (no auth, no payments in v1)

- **Free quotas:** 10 questions/day + 1 free 15‑Q mini‑mock/week. Visible meters; no paywalls in v1.
- **Device‑bound access:** Entitlements linked to a device anonymous ID; optional email capture to sync later. Full auth added post‑MVP.
- **Payments:** Deferred to v1.2 (UPI‑first packs and checkout behind a feature flag).

### 5) Admin & QA

- **Flag & refund (v1 without refund):** One‑tap flag removes the item from rotation and adds to the review queue. Auto credit refunds will be enabled with payments.
- **Version tagging:** Label content by framework/library/runtime version (e.g., React 18/19, TS 5.x).
- **Attribution & compliance:** Cite sources (e.g., MDN CC‑BY‑SA) and respect robots.txt/rate limits.

## Technical Architecture

- **Frontend:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, TanStack Query.
- **Backend:** Next.js API routes for ingestion, retrieval, MCQ generation, and attempts. Background job/worker for crawling to avoid serverless timeouts (v1: limit to ≤200 pages/job if needed).
- **Data & storage:** Supabase Postgres with pgvector; tables for `ingestions`, `documents`, `document_chunks`, `mcq_items`, `mcq_explanations`, `mcq_attempts`.
- **AI services:** Hugging Face embeddings (1024‑d). Optional reranker (OpenRouter/HF) later.
- **Security:** RLS on tables, deviceAnonId for pre‑auth tracking, rate limits on crawl and generation.
- **Payments (v1.2):** Razorpay/Cashfree orders + verification; GST invoice PDF; entitlements.

## Success Metrics

- Content quality: flagged‑item rate < 1%; explanation completeness with citations ≥ 95%.
- Learning efficacy: improvement in weak‑area accuracy after a drill ≥ 20%.
- Engagement (pre‑payments): DAU, average questions completed/user/day, drill completion rate ≥ 60%, repeat weekly sessions ≥ 40%.
- Performance: crawl‑to‑indexed latency within target (e.g., ≤ 30 minutes for 200 pages); quiz p95 < 300 ms.
- Post‑payments (v1.2): free‑to‑paid conversion ≥ 5–10%; second‑purchase rate ≥ 25%; refund rate < 3%.

## Risks & Constraints

- **Licensing:** Use only permissive sources; attribute MDN and avoid large verbatim copies.
- **Scale:** Crawling at scale may require dedicated workers/queues beyond serverless limits.
- **Label drift:** Difficulty/Bloom labels should be recalibrated periodically based on aggregate performance.

## Roadmap (v1 → v1.2)

- **v1 (React‑first):** Web ingest UI, crawl MDN/React subset, embeddings, MCQ generation with citations, quiz UI, adaptive drills, device‑bound access, flag/review queue.
- **v1.1:** Expand to JS/TS/HTML/CSS, add reranker, enhance analytics (peer percentile, readiness score), light admin tooling.
- **v1.2 (Payments):** UPI‑first packs (₹199/₹299), checkout, entitlements, refunds on flags, GST invoices, offer throttling.

## Communication Guidance (for novice users)

- When deeper context is needed, include short, concrete examples and cite official sources (e.g., MDN, React docs). Keep UI copy simple; avoid jargon.

## Task Response Style

- After completing any task, respond in 2–5 bullets: either provide a concise explanation when asked/queried, or outline the next set of actions when operating in agent/task mode.
