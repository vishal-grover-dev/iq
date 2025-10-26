# Evaluate Page - Frontend Skills Assessment

## Goal

Build a structured evaluation experience that assesses users' Frontend (React.js ecosystem) skills through a 60-question adaptive test with real-time analytics, weak-area identification, and comprehensive post-attempt review.

## Mission & Intent

**Core Mission**: Equip users with the knowledge and confidence to clear React.js Frontend interviews without hurdles.

### Key Principles

- **Quality Over Quantity**: Questions reflect real-world interview scenarios from authoritative sources
- **Actionable Insights**: Users learn exactly what they've mastered, where gaps exist, and what to study next
- **Learning-First Feedback**: No mid-attempt feedback (authentic evaluation), comprehensive explanations after completion
- **Real Interview Conditions**: ≥35% coding questions, Bloom diversity, no mid-attempt scores
- **Iterative Improvement**: Unlimited attempts with cross-attempt analytics for growth tracking

## Scope

- **Question Set Structure**: 60 questions per attempt (30 Easy, 20 Medium, 10 Hard) with topic/subtopic/Bloom/coding-mode tagging; minimum 35% coding-based questions.
- **Dynamic Generation & Selection**: LLM-driven question selection that checks existing question bank, avoids intra-attempt repeats, and generates new questions on-demand when gaps exist.
- **Neighbor Similarity Prevention**: Bank selection applies similarity checking to prevent similar questions from being selected in the same attempt.
- **Multi-Session Attempts**: Users can pause and resume within a single attempt; attempt state persists across sessions until all 60 questions are answered.
- **Unlimited Attempts**: Users can start new 60-question attempts as many times as they want; cross-attempt repetition is minimized but not strictly prohibited.
- **No Mid-Attempt Feedback**: Users answer all 60 questions without knowing if they're correct or incorrect. Feedback is revealed only after completing the entire attempt.
- **Post-Attempt Analytics**: Performance summary with topic/subtopic breakdown, Bloom-level accuracy, weak-area highlights, and recommendations.

## Key Terminology

- **Attempt**: A complete 60-question evaluation. One attempt = 60 questions, regardless of how many sessions it takes to complete.
- **Session**: A single continuous period of answering questions. Users can complete one attempt across multiple sessions.

## Question Structure

### Distribution per Attempt

- **Total**: 60 questions
  - **Easy**: 30 questions (50%)
  - **Medium**: 20 questions (33%)
  - **Hard**: 10 questions (17%)

### Required Metadata (per question)

- **Topic**: React, JavaScript, TypeScript, HTML, CSS, State Management, Routing, PWA, Accessibility, Testing
- **Subtopic**: Aligned with ingestion labels (e.g., Hooks: useState, Components, Selectors/Memoization)
- **Difficulty**: Easy | Medium | Hard
- **Bloom Level**: Remember | Understand | Apply | Analyze | Evaluate | Create
- **Coding Mode**: Boolean flag; `true` requires a code block in question or options
- **Coding Constraint**: Minimum 35% of all 60 questions must have `coding_mode = true` (≥21 coding questions per attempt)

### Coverage Goals

- **Balanced topic distribution**: No single topic exceeds 40% of attempt (≤24 questions)
- **Bloom diversity**: At least 3 distinct Bloom levels represented in each difficulty tier
- **Subtopic spread**: Avoid clustering (no more than 5 consecutive questions from same subtopic)
- **Coding threshold**: Minimum 35% coding questions (≥21 of 60)

## User Journey

### 1. Entry & Onboarding

- **First-Time**: Explainer about 60 questions, pause/resume, post-completion feedback, unlimited attempts
- **Resume**: Show progress (e.g., "22/60 answered"), started date, estimated time
- **New Attempt**: Past attempts summary with scores, "Start Attempt #N" button

### 2. Question Flow

- **Display**: Question + code (if coding), 4 options, metadata, progress bar ("15/60")
- **Submission**: No feedback shown, silent recording, immediate next question load
- **Navigation**: "Pause & Save" button, no backward navigation, auto-save after 30min idle

### 3. Completion & Results

- **Summary**: Score with gauge, topic/subtopic/Bloom breakdowns, weak areas with recommendations
- **Review**: All 60 questions with user/correct answers, explanations, citations; filter by correctness/topic
- **Actions**: Start new attempt, download report, back to dashboard

## Question Generation & Selection Logic

### LLM-Driven Selection

LLM analyzes attempt context (questions asked, distributions, coverage gaps) to determine optimal next question criteria autonomously.

### Database-First Strategy

1. Query `mcq_items` bank with exact 5-dimension match (~10ms)
2. Generate new question only if no exact match exists or all matches were already asked
3. Persist generated questions for reuse across users
4. Database grows organically based on actual evaluation needs

### Selection Algorithm

**4-Step Process per question:**

1. **Build Context**: Gather attempt state → LLM determines criteria
2. **Query Bank**: Fetch candidates matching criteria with scoring, exclude asked questions, soft-exclude last 2 attempts
3. **Generate (Fallback)**: If no candidates, invoke `generateMcqFromContext` with criteria + negative examples, persist to bank
4. **Assign**: Insert to `attempt_questions`, return to UI

## Data Model

### New Tables

#### `user_attempts`

Purpose: Track evaluation attempts per user. One row = one complete 60-question evaluation.

Key columns:

- `id` (uuid, primary key)
- `user_id` (uuid, FK to auth.users or device_id for pre-auth)
- `status` (enum: 'in_progress' | 'completed' | 'abandoned')
- `total_questions` (int, default 60, always 60 for v1)
- `questions_answered` (int, default 0, increments from 0 to 60)
- `correct_count` (int, default 0)
- `started_at` (timestamptz, when first question was assigned)
- `completed_at` (timestamptz, nullable, when 60th question was answered)
- `metadata` (jsonb): session_count, pause_count, time_spent_seconds, last_session_at

#### `attempt_questions`

Purpose: Link questions to attempts with order and user answers.

Key columns:

- `id` (uuid, primary key)
- `attempt_id` (uuid, FK to user_attempts)
- `question_id` (uuid, FK to mcq_items)
- `question_order` (int, 1–60)
- `user_answer_index` (int, 0–3, nullable until answered)
- `is_correct` (boolean, nullable until answered)
- `answered_at` (timestamptz, nullable)
- `time_spent_seconds` (int, nullable)

#### Reuse Existing `mcq_items` (Question Bank)

The `mcq_items` table serves as the **persistent question bank** that reduces LLM generation burden.

Add computed column or query helper for `coding_mode`:

- Definition: `coding_mode = (code IS NOT NULL AND code != '')`
- Used by LLM selector to filter coding vs. non-coding questions

## APIs

### 1. GET `/api/evaluate/attempts`

List attempts with summary stats. Optional `status` filter, `limit` for pagination.

### 2. POST `/api/evaluate/attempts`

Start new attempt. Creates `user_attempts` row, returns `attempt_id`.

### 3. GET `/api/evaluate/attempts/:id`

Fetch attempt + next question. Invokes LLM selector → queries bank → generates if needed. Returns attempt progress + question with metadata. No correctness feedback.

### 4. POST `/api/evaluate/attempts/:id/answer`

Submit answer (question_id, user_answer_index, time_spent). Records silently, returns only progress. No correctness/explanation/score revealed until completion.

### 5. GET `/api/evaluate/attempts/:id/results`

Post-completion analytics (FIRST feedback). Returns summary, topic/subtopic/Bloom breakdowns, weak areas, all 60 questions with answers/explanations/citations.

### 6. PATCH `/api/evaluate/attempts/:id/pause`

Pause attempt, update metadata (pause_count, last_session_at).

## Services & Hooks

### Services (`services/evaluate.services.ts`)

API client functions with JSDoc:

- `createAttempt()`: POST new attempt
- `getAttempts(status?)`: GET attempts list
- `getAttemptDetails(attemptId)`: GET attempt + next question (backend invokes LLM selector)
- `submitAnswer(attemptId, questionId, answerIndex, timeSpent)`: POST answer
- `getAttemptResults(attemptId)`: GET analytics + review
- `pauseAttempt(attemptId)`: PATCH pause

### AI Services (`services/ai.services.ts`)

Server-only functions for LLM-driven selection:

- `selectNextQuestion(attemptContext)`: LLM-driven selector
  - **Input**: Attempt context (questions asked, distributions, coverage)
  - **Output**: Target criteria (difficulty, coding_mode, preferred topics/subtopics/Bloom levels, reasoning)
  - **Model**: Use `gpt-4o-mini` with structured JSON output

### Hooks

TanStack Query hooks co-located in same file:

- `useCreateAttemptMutation()`: mutation for starting attempt
- `useAttemptDetailsQuery(attemptId)`: query for attempt + next question
- `useSubmitAnswerMutation(attemptId)`: mutation for submitting answer
- `useAttemptResultsQuery(attemptId, enabled)`: query for results (enabled only when completed)
- `usePauseAttemptMutation(attemptId)`: mutation for pausing

## UI Components

### Pages

#### `app/evaluate/page.tsx`

Purpose: Landing page for evaluation feature.
States:

- No active attempt: show "Start New Evaluation" button, past attempts summary
- Active attempt exists: show "Resume Evaluation" button with progress

#### `app/evaluate/[attemptId]/page.tsx`

Purpose: In-progress evaluation screen.
Layout:

- Top: progress bar (15/60), topic/subtopic/difficulty metadata strip, pause button
- Center: question card (question text, code block if present, four option buttons)
- Bottom: submit button, navigation hints (keyboard shortcuts)

#### `app/evaluate/[attemptId]/results/page.tsx`

Purpose: Post-attempt results and review.
Sections:

- Summary card: score, accuracy gauge, time spent
- Topic/Subtopic/Bloom charts or tables
- Weak areas panel with recommendations
- Review list: all 60 questions with filtering

### Components (`components/evaluate/`)

#### `questionCard.component.tsx`

Props: question, options, onSubmit, disabled
Renders: question text (with code syntax highlighting), four option buttons, submit action

#### `resultsChart.component.tsx`

Props: topicBreakdown or bloomBreakdown
Renders: bar chart or table showing accuracy per category

#### `weakAreasPanel.component.tsx`

Props: weakAreas (array of subtopic + recommendation)
Renders: list of weak areas with recommendation text and citation links

#### `questionReviewList.component.tsx`

Props: questions (array), filter controls
Renders: scrollable list of all questions with user's answer, correct answer, explanation

## Charting & Visualization

### Library Choice: Recharts

**Decision**: Use Recharts as the primary charting library for results visualization.

**Why Recharts:**

- **Composable React components**: Matches shadcn/ui philosophy
- **TypeScript native**: Strong type definitions out of the box
- **Mobile-responsive**: SVG-based with `<ResponsiveContainer>` utilities
- **Reasonable bundle size**: ~50KB gzipped for 2-3 chart types
- **Accessibility baseline**: Supports ARIA labels and keyboard navigation

### Chart Implementation Plan

**1. Score Gauge (Overall Performance)**

- **Component**: `<RadialBarChart>` with custom styling
- **Purpose**: Immediate emotional impact showing overall score (0-100%)
- **Location**: Top of results summary card

**2. Topic/Bloom Accuracy Bars**

- **Component**: Horizontal `<BarChart>`
- **Purpose**: Show relative strengths across topics and cognitive levels
- **Data**: Topic breakdown and Bloom breakdown

**3. Subtopic Breakdown (Hybrid Approach)**

- **Component**: Simple table with CSS-based inline progress bars
- **Purpose**: Detailed subtopic metrics without heavy library overhead

## Development Principles

**Core Philosophy**: Maximize reuse, SOLID/DRY/KISS principles, components ≤220 lines.

### Key Patterns

- **Services**: Follow `mcq.services.ts` patterns (Axios, TanStack Query, JSDoc ≥2 lines)
- **Database**: UUID keys, JSONB metadata, RLS policies, timestamps
- **Types**: `I` prefix (interfaces), `T` prefix (types), `E` prefix (enums)
- **Components**: Single responsibility, minimal props, compose shadcn/ui primitives
- **Utilities**: Extract shared logic (score calc, formatting), reuse existing utils

## UX & Accessibility

### Design Principles

- **Mobile-first**: Responsive across all devices
- **No mid-attempt feedback**: Maintain evaluation integrity; show progress (15/60) not score
- **Comprehensive post-completion feedback**: Detailed explanations, citations, weak areas
- **Keyboard-first**: 1-4 for options, Enter for submit, Esc for pause
- **Smooth animations**: Framer Motion with calm transitions (120-600ms); respect `prefers-reduced-motion`

### Accessibility

- ARIA labels, focus management, screen reader announcements
- No correctness during attempt; full feedback after completion
- WCAG AA contrast, skip navigation, live regions
- Reduced-motion fallbacks (opacity only, no translate/scale)

## Performance & Scalability

### Optimizations

- **Database-first**: ~10ms retrieval vs 5-10s generation; 90%+ from bank with proper seeding
- **Prefetching pipeline**: Triple-redundant (on load, on select, on submit); 5min/2min staleTime; <500ms transitions
- Batch analytics, paginated review (20 initial + lazy-load), TanStack Query caching

### Scaling

- Bank growth: Organic growth based on evaluation needs → 600-800 (3mo) → 1000+ (6mo)
- Rate limiting, indexed queries, materialized views for 10k+ users
- Bank monitoring alerts (<200 questions)

## Implementation Status

**✅ Complete:** All API routes, UI pages, components, charts, on-demand generation, prefetching pipeline, animations

**✅ Complete:** Question repetition remediation (Top‑K stochastic, cross‑attempt freshness, dynamic caps, resume anti‑cluster, coverage‑aware fallbacks)

## Tasks

### Core Implementation (Complete ✅)

- [x] **Data Model**: Migration `012-User-Attempts-And-Questions.sql` with RLS policies, indexes, triggers
- [x] **Types**: `evaluate.types.ts` with I/E prefixes following conventions
- [x] **AI Services**: `selectNextQuestion` in `ai.services.ts` with LLM-driven selection + fallback
- [x] **Services**: `evaluate.services.ts` with TanStack Query hooks
- [x] **APIs**: All 6 routes (GET/POST attempts, GET/PATCH attempt/:id, POST answer, GET results)
- [x] **Selection Algorithm**: 4-step process with LLM → bank query → generation fallback → assign
- [x] **UI Pages**: Landing, in-progress, results with all features
- [x] **Components**: QuestionCard, ResultsChart, WeakAreasPanel, QuestionReviewList
- [x] **Charts**: Recharts with ScoreGauge + PerformanceBarChart, responsive, themed
- [x] **On-Demand Generation**: Fallback with context retrieval, deduplication, graceful handling

### Phase 1: Prefetching Pipeline (Complete ✅)

- [x] **Core Infrastructure**: `prefetchAttemptDetails` with priority-based staleTime (5min/2min)
- [x] **Trigger 1**: Prefetch N+1 on question load (high priority)
- [x] **Trigger 2**: Prefetch N+2 on option select (medium priority)
- [x] **Trigger 3**: Prefetch on submit success (safety net)
- [x] **Memory Management**: Aggressive cleanup (2min gcTime + explicit removal)
- [x] **Loading States**: Skeleton + delayed message for rare misses
- **Result**: <500ms transitions 90%+ of time

### Phase 2: Animations (Complete ✅)

- [x] **Setup**: Framer Motion + enums (`EAnimationDuration`) + `usePrefersReducedMotion()` hook + variants
- [x] **Question Transitions**: 250ms crossfade with translate
- [x] **Progress Bar**: 300ms smooth fill with ease-out
- [x] **Progress Counter**: 150ms fade-through
- [x] **Interactive Elements**: Hover/active scale (120-180ms) on option buttons
- [x] **Results Summary**: 600ms orchestrated sequence (score → message → breakdowns)
- [x] **Charts**: Recharts animations (400-500ms) with count-up + reduced-motion support
- [x] **Review List**: Staggered fade-in (20ms intervals) + lazy-load with IntersectionObserver
- [x] **Accessibility**: All animations respect `prefers-reduced-motion`

### Remaining Tasks

- [ ] **QA: Bank Coverage**: Verify question bank coverage across all dimensions
- [ ] **QA**: Test multi-session resume (pause and restart); verify no state loss
- [ ] **QA**: Test 35% coding threshold enforcement across multiple attempts
- [ ] **QA**: Test database-first strategy: monitor how often generation is triggered vs. bank usage
- [ ] **QA**: Visual and accessibility checks (keyboard nav, ARIA labels, color contrast)
- [ ] **QA**: Verify no intra-attempt repeats; test cross-attempt exclusion logic
- [ ] **Monitoring**: Add metrics for bank usage vs. generation frequency

## Postmortem: Question Repetition and React-Biased Resumes

### Symptoms Observed

- Users frequently encounter the same React question across attempts and on resume
- Resume flow often starts with a React question, sometimes the exact same item as previously seen

### Root Causes Identified

1. **Intra-attempt exclusion was brittle**: Exclusion of already-asked `question_id`s relied on a formatted list that can fail to match UUIDs reliably
2. **Cross-attempt exclusion missing**: We did not exclude questions from the user's last two completed attempts
3. **Topic bias toward React**: Default/fallback `preferred_topics` include React first; the bank query treats preferred topics as a hard filter rather than soft preference
4. **Deterministic candidate selection**: After scoring, the top candidate was selected deterministically
5. **Generation fallback defaulted to React**: When the bank had no candidates, on-demand generation defaulted the topic to React

### Remediation Plan (Engineering Tasks)

#### Phase 0: Static Ontology Configuration (Prerequisite)

- [x] Replace LLM-driven ontology generation with a static JSON (`data/static-ontology.json`)
- [x] Load topics, subtopics, and weights via `utils/static-ontology.utils.ts`
- [x] Remove runtime ontology, archetype, and weight generation utilities and APIs
- [x] Ensure selection and generation reference the static configuration
- [x] Update docs to describe static ontology data source and maintenance process

#### Phase 1: Selection Robustness Fixes (Complete ✅)

- [x] **Task 1.1**: Fix intra-attempt UUID exclusion robustness
- [x] **Task 1.2**: Implement cross-attempt soft exclusion (last 2 completed attempts)
- [x] **Task 1.3**: Convert preferred topics to scoring preferences (not hard filter)
- [x] **Task 1.4**: Implement stochastic top‑K selection with randomness
- [x] **Task 1.5**: Add resume anti-cluster rule
- [x] **Task 1.6**: Update generation fallback to use coverage-aware topic selection
- [x] **Task 1.7**: Create weighted-random utility for reuse
- [x] **Task 1.8**: Extend selector fallback with weighted randomization
- [x] **Task 1.9**: Add structured logging for selection observability

#### Generation Robustness (On‑Demand Fallback) (Complete ✅)

- [x] **Negative examples from current attempt**: Built from last ~20 asked questions and passed as `negativeExamples` during on‑demand fallback
- [x] **Explicit avoid lists for generator**: Generation fallback now computes avoid lists from overrepresented topics and recent subtopics
- [x] **Pre‑assign similarity gate**: Before assignment, compute content_key and reject if it matches any asked‑in‑attempt item

### QA & Monitoring (Prevention)

- **Automated tests**: Intra-attempt uniqueness, cross-attempt freshness, topic balance, resume path, fallback paths
- **Metrics & alerts**: Track distributions per attempt, selection sources, repetition indicators
- **Operational playbook**: Response procedures for repetition spike, React bias, ontology staleness, bank insufficiency

## Acceptance Criteria

- User can start a new evaluation attempt and see onboarding explainer (first-time only)
- System generates/selects 60 questions following distribution (30 Easy, 20 Medium, 10 Hard) and coding threshold (≥35%)
- No question repeats within a single 60-question attempt; cross-attempt repetition is minimized but not strictly prohibited
- User can answer questions without receiving any feedback (correct/incorrect) during the attempt
- System records answers silently and immediately loads next question after each submission
- Progress bar shows questions answered (e.g., "22/60") but never shows score during attempt
- User can pause mid-attempt and resume later from exact same point across multiple sessions
- After completing all 60 questions in an attempt, user sees results summary with topic/subtopic/Bloom breakdowns for the FIRST time
- Weak areas are highlighted with actionable recommendations and citation links
- Review section displays all 60 questions with user's answer, correct answer, explanation (2–5 lines), and citations
- User can start unlimited new 60-question attempts; past completed attempts are accessible from dashboard with scores and dates
- System tracks sessions per attempt (metadata.session_count increments each time user resumes an in-progress attempt)

## Automated Testing Strategy

### Critical Coverage

**P0 Blockers:**

- No mid-attempt feedback (verify no correctness/score during 60-question flow)
- Intra-attempt uniqueness (all 60 questions unique)
- Distribution enforcement (30/20/10, ≥35% coding, ≤40% per topic)
- Accessibility (keyboard nav, screen reader, WCAG AA contrast)

**P1 High:**

- Multi-session resume (pause → resume → complete)
- Cross-attempt soft exclusion (prefer new questions)
- Weak areas/explanations/citations completeness
- Performance (<500ms question transitions, <2s results load)

**P2 Medium:**

- Visual regression (desktop/mobile profiles)
- Animation states (prefers-reduced-motion)

### Test Organization

`tests/evaluate/`: integrity/, e2e/, distribution/, reliability/, mission/, a11y/, performance/, visual/

### Execution

- Pre-commit: Smoke tests (3-5 min)
- Pre-merge: Full suite (15-20 min)
- Nightly: Regression + visual + performance
