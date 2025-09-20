# Generation of Questions (MCQ) Page

## Goal

Design and plan a new page to generate, review, and save high‑quality multiple‑choice questions (MCQs) grounded in the ingested React documentation. The experience shows a single question at a time, supports quick edits through a chat box, and streams the automation flow using two AI personas: Generator and Judge.

## Scope (now)

- UI page to display one MCQ at a time with:
  - Question text (with code blocks and syntax highlighting)
  - Four options with the correct answer clearly marked
  - Citations to source documentation
  - Metadata: subtopic, Bloom taxonomy level, difficulty, optional version
- Bottom chat box to request edits (question/options/difficulty/Bloom level, etc.); the AI returns an updated version.
- Submit action saves the finalized question (all fields + metadata) to DB (`mcq_items`).
- Automation using two AI personas with visible steps: Generation → Judge evaluation → Final approval.
- Target throughput: 250–500 diverse questions across React subtopics, Bloom levels, and difficulties (mix of theory and code).

## Non‑Goals (now)

- Payments, quotas, and user auth flows (pre‑auth device model remains acceptable for MVP).
- Advanced admin workflows beyond simple batch automation and status visibility.
- Deep analytics beyond basic counts and basic quality flags.

## UX & UI

- Single‑Question View
  - Title/metadata strip: subtopic, Bloom level, difficulty, version (if applicable)
  - Question body supports code blocks with proper syntax highlighting and readable typography
  - Options (A–D) with a visual marker for the correct one; ensure accessibility (labels and keyboard navigation)
  - Citations section with one or more links to source documentation (domain + page title)
- Persona Progress Panel
  - Step 1: Generation (stream partial content as it forms)
  - Step 2: Judge evaluation (criteria, verdict: approve or request changes)
  - Step 3: Final approval (ready to submit/save)
- Revision Chat Box
  - Free‑form prompts to request edits; the AI responds with an updated MCQ version
  - Preserve conversation context for the current MCQ until submission
- Submit Action

  - Validates fields and persists to `mcq_items`; show toast and move to next item
  - Prevent double‑submits and indicate saving status

- Automate Generation Button
  - Secondary button in the page header: "Automate generation"
  - Opens a modal/drawer that shows current coverage from `mcq_items` for the current user:
    - Coverage matrix: subtopic × difficulty × Bloom with counts
    - Summary: total items, uncovered cells, top missing areas
  - Controls:
    - Target count (e.g., generate 25/50/100)
    - Subtopic include/exclude, preferred distribution across difficulties and Bloom levels
    - Near‑duplicate sensitivity (strict/standard/lenient)
  - Behavior:
    - Prioritize uncovered or under‑covered cells first; avoid repeats of subtopic+difficulty+Bloom combos until ≥85% of that cell is covered
    - Start/Pause/Resume/Cancel automation; live progress with counts and recent items list
    - Uses SSE to stream plan → per‑item generation → judge → save → coverage updates

## AI Personas & Flow

- Persona 1: Generator
  - Consumes retrieved chunks (from existing hybrid retrieval) filtered by topic/subtopic/version
  - Produces: question, four options, correct index, Bloom level, difficulty, citations
- Persona 2: Judge
  - Evaluates question clarity, option validity, correctness, citation adequacy, Bloom/difficulty labeling
  - Verdict: approve or request regeneration with specific reasons and suggestions
- Streaming/Orchestration

  - Show real‑time progress (SSE preferred for simplicity and compatibility with serverless routes)
  - Event types include: generation_started, generation_delta, generation_complete, judge_started, judge_feedback, judge_result, finalized

- Automation runs
  - Iteratively invoke Generator → Judge cycles guided by the coverage matrix
  - Each iteration is passed exclusion constraints (existing subtopic+difficulty+Bloom combos, and recent question hashes) to avoid repeats
  - If Judge requests changes, the item is regenerated with the same constraints before evaluation

## Data & Storage

- Use existing `mcq_items` (see migration 004):
  - Fields: topic, subtopic, version, difficulty (Easy/Medium/Hard), bloom_level (Remember/Understand/Apply/Analyze/Evaluate/Create), question, options[4], correct_index, citations (jsonb), labels (jsonb), ingestion_id (optional)
- Optional `mcq_explanations` linkage is available for extended explanations when needed

- Coverage & Deduplication
  - Coverage matrix derived from `mcq_items` grouped by subtopic, difficulty, Bloom; optionally version
  - Dedupe keys:
    - Combo key: `${subtopic}|${difficulty}|${bloom_level}` to evenly cover the grid
    - Content key: hash of a normalized question gist (text without markup/code formatting) to catch near duplicates
  - Recent window: maintain an in‑memory sliding window of recent content keys to prevent immediate repeats within a run

## APIs (to be implemented later)

- SSE Generation Stream
  - Purpose: orchestrate Generator → Judge → Final approval; push event updates to UI
  - Input: topic, subtopic (optional), version (optional), difficulty (optional), Bloom (optional), query/context
  - Output events: generation_started, generation_delta, generation_complete, judge_started, judge_feedback, judge_result, finalized
- Revision Endpoint
  - Purpose: apply user edit requests (chat) to current MCQ and return updated MCQ
  - Input: current MCQ + user instruction; Output: updated MCQ
- Save Endpoint

  - Purpose: persist finalized MCQ to `mcq_items`; returns saved record id and echo of stored fields

- Automation Plan (optional)

  - Purpose: compute and return a plan based on current coverage and requested target/distribution
  - Output: coverage matrix, planned queue (combos), estimated cost/time

- Automation Start (SSE)
  - Purpose: execute the plan; stream events including plan_ready, item_started, item_completed, judge_result, saved, coverage_update, run_completed
  - Input: target count, include/exclude filters, distribution, near‑dup sensitivity

## Automation to 250–500 Items

- Batch runner (CLI or admin‑only trigger) that cycles through React subtopics with a grid over Bloom levels and difficulties
- De‑duplication rules to avoid near‑duplicates; ensure broad coverage by subtopic and cognitive level
- Safety rails: enforce citations presence, option correctness, and rejection thresholds by Judge
- Observability: counts per subtopic/difficulty/Bloom; basic error reasons
- Non‑repeat policy: do not repeat subtopic+difficulty+Bloom combos until ≥85% of available combos have at least one item; avoid near duplicates via content keys

## Quality & Safety

- Guardrails: require citations, validate four options, and ensure a single correct answer
- Label discipline: Bloom/difficulty assigned consistently; judge corrects or rejects mislabeled items
- Accessibility: keyboard‑navigable options and readable code blocks; ensure sufficient color contrast

## Risks & Mitigations

- Quality drift → Judge persona with strict criteria and minimum thresholds
- Latency/cost → cap context/chunks, stream partials, batch when automating
- Duplicates → near‑duplicate detection (hash/shingle) and catalog‑style coverage tracking

## Acceptance Criteria

- Page displays a single MCQ with metadata, options, and citations; code blocks render legibly
- Persona progress streams visible steps and verdicts
- Chat‑based revision returns an updated MCQ without page reload
- Submit stores the MCQ into `mcq_items` with all fields and user scoping
- Batch automation can produce 250–500 diverse questions with low duplicate rate
- Automate button present; automation respects coverage and exclusion constraints to avoid repeats across subtopic, difficulty, and Bloom

## Tasks

- [x] UI: Build page structure, MCQ card, citations, metadata chips, and options UI
  - Added proper text wrapping for long words and newline handling in MCQ questions
- [ ] UI: Persona progress panel with streaming states (SSE)
- [ ] UI: Revision chat box wired to revision endpoint
- [ ] UI: Add "Automate generation" button and modal with coverage matrix and controls
- [ ] API: SSE generation stream (Generator → Judge → Finalize)
- [ ] API: Revision endpoint for chat‑driven edits
- [ ] API: Save endpoint; persist to `mcq_items` with RLS‑safe scoping
- [ ] API: Automation plan and start (SSE) endpoints with coverage/exclusion constraints
- [ ] Services: Axios clients and TanStack Query hooks where appropriate
- [ ] Automation: Batch runner to reach 250–500 items across subtopics/Bloom/difficulty
- [ ] QA: Visual and a11y checks; review code‑block readability; verify citation linking
- [ ] Docs: Update `specs/blueprints/existing-files.md` upon implementation completion
