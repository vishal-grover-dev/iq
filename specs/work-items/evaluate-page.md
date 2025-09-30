# Evaluate Page - Frontend Skills Assessment

## Goal

Build a structured evaluation experience that assesses users' Frontend (React.js ecosystem) skills through a 60-question adaptive test with real-time analytics, weak-area identification, and comprehensive post-attempt review.

## Mission & Intent

**Core Mission**: Equip users with the knowledge and confidence to clear React.js Frontend interviews without hurdles.

This is not merely a testing tool—it is a comprehensive interview preparation experience. Every design decision, from question selection to feedback presentation, must serve this ultimate goal: **interview readiness**.

### What This Means for Development

- **Quality Over Quantity**: Every question must reflect real-world interview scenarios drawn from authoritative sources (React docs, web.dev/learn, MDN, TypeScript Handbook, Redux Toolkit, React Router). Prioritize clarity, accuracy, and practical relevance over volume.

- **Actionable Insights**: Post-attempt analytics must go beyond scores. Users should leave each attempt knowing exactly:

  - Which topics/subtopics they've mastered
  - Where their knowledge gaps exist (specific areas like "Hooks: useMemo" or "Selectors/Memoization")
  - What to study next with concrete recommendations and authoritative citations
  - How their understanding maps to different cognitive levels (Bloom taxonomy)

- **Learning-First Feedback**: Post-attempt explanations aren't punitive—they're teaching moments. Each explanation (2–5 lines) must clarify the "why" behind the correct answer and link to source documentation for deeper learning. By revealing feedback only after all 60 questions, users experience authentic evaluation conditions while still receiving comprehensive learning support afterward.

- **Comprehensive Coverage**: The 60-question structure ensures breadth across the React.js ecosystem (React core, JavaScript fundamentals, TypeScript, State Management, Routing, HTML/CSS, Testing, Accessibility, PWA). Users should feel confident they've been tested on topics interviewers actually ask about.

- **Real Interview Conditions**: Mix of theory (Remember/Understand) and practical application (Apply/Analyze/Evaluate) with significant coding questions (≥35%) mirrors actual interview formats. No mid-attempt feedback maintains authentic evaluation conditions—users answer all 60 questions without knowing their score, just like a real interview assessment. Comprehensive feedback is provided after completion for learning.

- **Iterative Improvement**: Unlimited attempts with cross-attempt analytics let users track growth over time. Weak-area recommendations guide focused study between attempts, creating a virtuous cycle: Evaluate → Learn → Evaluate again → Improve.

### Success Definition

A user has succeeded when they can:

1. **Answer confidently** across React.js topics without panic or guesswork
2. **Identify patterns** in questions and recognize concepts from authoritative sources
3. **Explain their reasoning** (the explanations we provide model this thinking)
4. **Know their gaps** and have a clear study roadmap after each attempt
5. **Feel prepared** to walk into a real React.js frontend interview with minimal anxiety

### Development Guardrails

When implementing features or making trade-offs, always ask:

- "Does this help users clear interviews, or just test them?"
- "Are we teaching effectively, or just scoring?"
- "Will users know what to study next after this interaction?"
- "Is this question/feedback grounded in real interview scenarios?"

If the answer to any of these is unclear or "no," reconsider the approach.

## Scope (now)

- **Question Set Structure**: 60 questions per attempt (30 Easy, 20 Medium, 10 Hard) with topic/subtopic/Bloom/coding-mode tagging; minimum 35% coding-based questions.
- **Dynamic Generation & Selection**: LLM-driven question selection that checks existing question bank, avoids intra-attempt repeats, and generates new questions on-demand when gaps exist.
- **Multi-Session Attempts**: Users can pause and resume within a single attempt; attempt state persists across sessions until all 60 questions are answered.
- **Unlimited Attempts**: Users can start new 60-question attempts as many times as they want; cross-attempt repetition is minimized but not strictly prohibited (coverage priority over novelty).
- **No Mid-Attempt Feedback**: Users answer all 60 questions without knowing if they're correct or incorrect. Feedback is revealed only after completing the entire attempt.
- **Post-Attempt Analytics**: Performance summary with topic/subtopic breakdown, Bloom-level accuracy, weak-area highlights, and recommendations.
- **Comprehensive Review**: All 60 questions shown with user's answer, correct answer, concise explanation (2–5 lines), and source citations for further learning.

## Key Terminology

- **Attempt**: A complete 60-question evaluation. One attempt = 60 questions, regardless of how many sessions it takes to complete.
- **Session**: A single continuous period of answering questions. Users can complete one attempt across multiple sessions (e.g., 15 questions today, 20 tomorrow, 25 the day after).
- **Example**:
  - User starts Attempt #1 on Monday, answers 22 questions, then pauses → Session 1 complete, Attempt #1 in progress (22/60)
  - User resumes Attempt #1 on Wednesday, answers 18 more questions, then pauses → Session 2 complete, Attempt #1 in progress (40/60)
  - User resumes Attempt #1 on Friday, answers final 20 questions → Session 3 complete, Attempt #1 completed (60/60)
  - User starts Attempt #2 the following week → New 60-question evaluation begins

## Non-Goals (now)

- Multi-user leaderboards or peer comparison (deferred to v1.2).
- Timed questions with per-question countdowns (optional for v1.1).
- Adaptive difficulty mid-attempt (fixed distribution per attempt for v1).
- Payment gates or premium question sets (free-tier only in v1).
- Question flagging/reporting during evaluation (review-only in v1).

## Knowledge Base & Sources

All questions are generated from and cite authoritative documentation that has been ingested and indexed:

### Primary Sources (551 docs, 3,364 chunks)

- **React** (49 docs): Official React documentation (`reactjs/react.dev`)
- **State Management** (87 docs): Redux Toolkit documentation (`reduxjs/redux-toolkit`)
- **Routing** (200 docs): React Router documentation (`remix-run/react-router`)
- **JavaScript** (93 docs): MDN JavaScript Guide + web.dev/learn/javascript (27 docs) + web.dev supplementary (forms: 25, images: 18, performance: 15, privacy: 7)
- **TypeScript** (5 docs): Microsoft TypeScript Handbook
- **HTML** (23 docs): web.dev/learn/html + MDN HTML
- **CSS** (58 docs): MDN CSS + web.dev/learn/css (40 docs) + web.dev/learn/design (18 docs)
- **Accessibility** (22 docs): web.dev/learn/accessibility (comprehensive practical guide)
- **PWA** (4 docs): web.dev/learn/pwa
- **Testing** (10 docs): web.dev/learn/testing + Testing Library + Jest

### Coverage Strengths

- **Modern patterns**: web.dev/learn provides practical, modern approaches (210 docs across accessibility, CSS, design, forms, HTML, images, JavaScript, performance, privacy, PWA, testing)
- **Comprehensive depth**: MDN and official docs provide exhaustive API references and conceptual foundations
- **Real-world focus**: Redux Toolkit (87 docs) and React Router (200 docs) ensure state management and routing questions reflect production patterns

### Citation Policy

Every question must include at least one citation linking back to source documentation (React docs, web.dev, MDN, TypeScript Handbook, Redux Toolkit, React Router). Users clicking citations should land on the exact page that explains the concept being tested.

## Question Structure

### Distribution per Attempt

- **Total**: 60 questions
  - **Easy**: 30 questions (50%)
  - **Medium**: 20 questions (33%)
  - **Hard**: 10 questions (17%)

### Required Metadata (per question)

- **Topic**: React, JavaScript, TypeScript, HTML, CSS, State Management, Routing, PWA, Accessibility, Testing (from existing ontology)
- **Subtopic**: Aligned with ingestion labels (e.g., Hooks: useState, Components, Selectors/Memoization)
- **Difficulty**: Easy | Medium | Hard
- **Bloom Level**: Remember | Understand | Apply | Analyze | Evaluate | Create
- **Coding Mode**: Boolean flag; `true` requires a code block in question or options
- **Coding Constraint**: Minimum 35% of all 60 questions must have `coding_mode = true` (≥21 coding questions per attempt)

### Coverage Goals

**Note**: These goals are enforced by the **LLM selector**, not user choices. Users simply answer questions; the system intelligently ensures balanced coverage.

- **Balanced topic distribution**: No single topic exceeds 40% of attempt (≤24 questions). LLM tracks topic counts and avoids over-represented topics.
- **Bloom diversity**: At least 3 distinct Bloom levels represented in each difficulty tier. LLM ensures cognitive depth variety (not just Remember/Understand).
- **Subtopic spread**: Avoid clustering (no more than 5 consecutive questions from same subtopic). LLM monitors recent questions and shifts topics for variety.
- **Coding threshold**: Minimum 35% coding questions (≥21 of 60). LLM accelerates coding questions if falling behind pace.

## User Journey

### 1. Entry & Onboarding

- **First-Time Users**: Show a brief explainer modal/screen:
  - "You'll answer 60 questions to complete one evaluation attempt."
  - "You can pause anytime and resume later—your progress is saved."
  - "Complete all 60 questions across multiple sessions at your own pace."
  - "After completion, review your performance, identify weak areas, and get study recommendations."
  - "Take unlimited attempts to track your improvement over time."
- **Returning Users** (with incomplete attempt): Show resume prompt with progress:
  - Example: "Continue your attempt: 22/60 questions answered"
  - Display: started date, sessions so far, estimated time remaining
- **Returning Users** (no active attempt): Show "Start New Evaluation" button with past attempts summary:
  - Display: total attempts completed, average score, best score
  - Show recent completed attempts with scores and completion dates
  - Call-to-action: "Start Attempt #[N+1]"

### 2. Question Flow (In-Progress Attempt)

- **Question Display**:
  - Question text with syntax-highlighted code blocks (if coding mode)
  - Four options (A–D) as radio buttons or cards; keyboard shortcuts (1–4) for quick selection
  - Metadata strip: topic, subtopic, difficulty (optional: hide difficulty to avoid bias)
  - Progress indicator: "Question 15 / 60" with visual bar
- **Answer Submission**:
  - User selects an option and clicks "Submit Answer" (or presses Enter)
  - **No feedback shown**: system records answer silently and immediately loads next question
  - No indication of correct/incorrect; no explanation or citation during attempt
  - Smooth transition to next question (optional: brief "Answer recorded" toast for 1s)
  - User continues answering questions without knowing their score
- **Navigation**:
  - "Pause & Save" button persists current state and returns user to dashboard/home
  - No backward navigation during active attempt (prevent answer changes and maintain evaluation integrity)
  - Session timeout: if idle >30 min, auto-save state and show resume prompt on return
  - Progress bar shows questions answered (e.g., "22/60") but not score

### 3. Completion & Results

**Important**: This is the FIRST time users see any feedback about their answers.

- **Summary Screen** (appears immediately after answering question 60):
  - Hero metric: "42 / 60 Correct (70%)" with visual gauge or score card
  - Celebration/encouragement message based on score tier
  - Topic breakdown: table or chart showing accuracy per topic (e.g., React: 8/12, JavaScript: 10/15)
  - Subtopic breakdown: expandable list with correct/total per subtopic
  - Bloom-level performance: bar chart showing accuracy at Remember vs. Apply vs. Analyze, etc.
  - Weak areas highlight: "You struggled with State Management (Selectors/Memoization): 2/5 correct. Review Redux Toolkit docs."
- **Review Section**:
  - Scrollable list of all 60 questions with:
    - Question text and options
    - User's answer (highlighted in red if incorrect, green if correct)
    - Correct answer (always shown)
    - Explanation (2–5 lines) - **first time user sees this**
    - Source citation link(s) for further reading - **first time user sees this**
  - Filter controls: "Show Only Incorrect" toggle, filter by topic/difficulty
  - Jump-to-question navigation for quick review
- **Actions**:
  - "Start New Attempt" button (creates a new 60-question attempt)
  - "Download Report" (optional: PDF or CSV export of results)
  - "Back to Dashboard" link

## Question Generation & Selection Logic

### LLM-Driven Selection Approach

The system uses an **intelligent LLM-driven selector** that analyzes the entire attempt context to determine the next question.

**Key Principle**: Users NEVER decide whether the next question should be coding or non-coding, Easy or Hard, React or JavaScript. The LLM selector makes these decisions autonomously by:

1. Analyzing all questions asked so far in the current attempt (topics, subtopics, difficulty, Bloom levels, coding mode)
2. Computing current progress toward distribution targets (30 Easy, 20 Medium, 10 Hard, ≥35% coding)
3. Identifying coverage gaps (under-represented topics, missing Bloom levels, subtopic clustering)
4. Determining optimal criteria for the next question to ensure balanced, comprehensive evaluation

The user's job is simple: **answer questions**. The system's job is complex: **ensure those 60 questions provide a thorough, balanced assessment of React.js frontend skills**.

### Database-First Strategy (Reducing LLM Burden)

**Critical Design Principle**: Questions are stored in the database and reused across attempts to minimize LLM generation costs and latency.

**Flow**:

1. **Bank First**: ALWAYS query existing questions in `mcq_items` database table first
2. **Generate as Fallback**: Only invoke LLM generation when no suitable questions exist in bank
3. **Persist Generated Questions**: Every new question generated is immediately saved to `mcq_items` for future reuse
4. **Bank Growth**: Over time, the question bank grows organically, and generation becomes increasingly rare
5. **Cost Reduction**: As bank matures (target: 250–500 questions pre-seeded, 1000+ over time), most attempts use only database queries

**Benefits**:

- **Lower costs**: Database queries are ~1000x cheaper than LLM generation
- **Faster response**: Retrieving from DB takes ~10ms vs. generation taking 5–10s
- **Consistent quality**: Questions in bank have already been validated and used in previous attempts
- **Predictable latency**: Users experience minimal wait times after initial bank seeding

**Implementation Note**: The selection algorithm prioritizes bank queries (Step 2) over generation (Step 3). Generation should be the exception, not the norm, once the system is operational.

### Selection Algorithm (per question in attempt)

For each of the 60 questions in an attempt, execute the following steps in order:

#### Step 1: Build Context for LLM Decision

Gather current attempt state and provide to LLM selector:

- **Questions asked so far**: List of all questions in this attempt with metadata:
  - `question_order` (1–59 for determining question 60)
  - `topic`, `subtopic`, `difficulty`, `bloom_level`, `coding_mode`
- **Current distribution**:
  - Easy: X/30, Medium: Y/20, Hard: Z/10
  - Coding questions: N/60 (target: ≥21 for 35% threshold)
- **Topic/Subtopic coverage**: Count per topic and subtopic to identify under-represented areas
- **Bloom coverage**: Distribution across Remember, Understand, Apply, Analyze, Evaluate, Create
- **Recent clustering**: Last 3–5 questions' subtopics to detect patterns

**LLM Prompt Context** (simplified):

```
You are selecting question #{N} of 60 in a React.js frontend evaluation.

Current attempt state:
- Questions answered: {N-1}
- Easy: {count}/30, Medium: {count}/20, Hard: {count}/10
- Coding questions: {count}/60 (need ≥21 by end)
- Recent subtopics: [{last 5 subtopics}]
- Topic distribution: {React: X, JavaScript: Y, ...}
- Bloom distribution: {Remember: X, Apply: Y, ...}

Coverage goals:
- Balanced topic distribution (no topic >40%)
- Bloom diversity (≥3 levels per difficulty tier)
- Avoid subtopic clustering (no >5 consecutive from same subtopic)
- Coding threshold: ≥35% (21+ coding questions)

Determine optimal criteria for next question:
- difficulty: Easy | Medium | Hard
- coding_mode: true | false
- preferred_topics: [list]
- preferred_subtopics: [list]
- preferred_bloom_levels: [list]
```

**LLM Output**:

```json
{
  "difficulty": "Medium",
  "coding_mode": true,
  "preferred_topics": ["State Management", "React"],
  "preferred_subtopics": ["Selectors/Memoization", "Hooks: useMemo"],
  "preferred_bloom_levels": ["Apply", "Analyze"],
  "reasoning": "Need to increase Medium count (12/20) and coding questions (18/42 so far, need to accelerate). Last 3 questions were React hooks; shift to State Management for diversity."
}
```

#### Step 2: Query Existing Question Bank

- Fetch candidate questions from `mcq_items` matching **LLM-determined criteria** from Step 1:
  - **Required filters**:
    - `difficulty` (exact match from LLM output)
    - `coding_mode` (exact match: `code IS NOT NULL AND code != ''` if true)
  - **Soft filters** (prioritize but not strict):
    - `topic IN preferred_topics` (from LLM output)
    - `subtopic IN preferred_subtopics` (from LLM output)
    - `bloom_level IN preferred_bloom_levels` (from LLM output)
  - **Exclusions**:
    - Questions already used in current attempt (`attempt_questions.question_id NOT IN (...)`)
    - Questions used in user's last 2 completed attempts (soft exclusion, override if pool is small)
  - **Ordering**: Rank by:
    1. Matches preferred topics/subtopics (higher score)
    2. Matches preferred Bloom levels (medium score)
    3. Not used in recent attempts (tiebreaker)
    4. Randomize within top candidates
- If pool has ≥3 candidates, select one and skip to Step 4 (assign).
- If pool has 1-2 candidates, use best match and skip to Step 4.

#### Step 3: Generate New Question (if bank insufficient)

**Important**: This step should be rare once the question bank is properly seeded. It's a fallback, not the primary path.

- If zero candidates exist in bank after Step 2:
  - Invoke MCQ generation flow (reuse existing `generateMcqFromContext` service):
    - **Input**: LLM-determined criteria from Step 1:
      - `difficulty`, `coding_mode`, `preferred_topics`, `preferred_subtopics`, `preferred_bloom_levels`
    - **Retrieval**: Fetch top-k chunks from `document_chunks` filtered by preferred topics/subtopics
    - **Negative examples**: Pass already-asked questions from current attempt to avoid similarity
    - **Context for generator**: Include LLM reasoning from Step 1 to guide question creation
    - **Judge validation**: Ensure generated question meets quality criteria and matches requested difficulty/Bloom/coding_mode
  - On success:
    - **Persist to `mcq_items` database table** (with all metadata: topic, subtopic, difficulty, bloom_level, coding_mode, question, options, correct_index, explanation, citations, code)
    - Use immediately in current attempt
    - **Future benefit**: This question is now available for all future attempts, reducing generation need
  - On failure (timeout, low quality):
    - Retry with relaxed criteria (drop Bloom preference → drop subtopic preference)
    - If still fails, select from bank with relaxed filters or log error for operator review

#### Step 4: Assign Question to Attempt

- Insert row into `attempt_questions` table:
  - Columns: `attempt_id`, `question_id`, `question_order` (1–60), `assigned_at` (timestamp)
- Return question payload to UI with metadata

### Cross-Attempt Repetition Policy

- **Strict Intra-Attempt**: No question repeats within the same 60-question attempt (enforced by exclusion in Step 2). If a user pauses at question 30 and resumes later, questions 31–60 will never include any from questions 1–30 of that same attempt.
- **Soft Cross-Attempt**: Prefer questions not seen in user's last 2 completed attempts, but allow overlap if question bank is limited. Rationale: coverage and difficulty balance take priority over novelty; users benefit from revisiting topics when starting a new 60-question attempt.
- **Important**: "Attempt" = the full 60 questions, not individual sessions. A user answering 20 questions per day over 3 days is still completing 1 attempt, and all 60 questions in that attempt will be unique.

### LLM Decision-Making Logic

The LLM selector uses the following heuristics (encoded in its prompt):

1. **Distribution Enforcement (Hard Constraints)**:

   - Easy: 30 questions → If 30 Easy already asked, never select Easy
   - Medium: 20 questions → If 20 Medium already asked, never select Medium
   - Hard: 10 questions → If 10 Hard already asked, never select Hard
   - Coding threshold: If approaching question 50 and coding count < 18, force `coding_mode=true`

2. **Diversity Optimization (Soft Constraints)**:

   - Topic balance: If React > 24 questions (40% limit), avoid React
   - Subtopic clustering: If last 3 questions same subtopic, avoid that subtopic
   - Bloom diversity: If Easy tier has 0 Apply questions after 15 Easy asked, prioritize Apply

3. **Coverage Gaps (Prioritization)**:

   - Identify under-represented topics/subtopics
   - Identify under-represented Bloom levels within difficulty tiers
   - Balance theoretical (Remember/Understand) vs. practical (Apply/Analyze/Evaluate)

4. **Context-Aware Reasoning**:
   - "Need coding questions soon" → prioritize `coding_mode=true`
   - "Too many React hooks recently" → shift to State Management or JavaScript
   - "Only Remember/Understand so far in Easy" → add Apply/Analyze for depth

### Edge Cases

- **Insufficient Bank + Generation Failure**: If generation fails and no candidates exist, LLM relaxes criteria iteratively:

  1. Drop preferred Bloom levels (any Bloom acceptable)
  2. Drop preferred subtopics (any subtopic in preferred topics)
  3. Drop preferred topics (any topic acceptable)
  4. Drop coding mode requirement (if stuck, allow non-coding even if target not met)
     Log warning for operator review when criteria are relaxed.

- **35% Coding Threshold Miss**: LLM monitors coding progress. If by question 50 the coding count is below 18 (projected to miss 35%), LLM forces `coding_mode=true` for remaining questions until threshold is met or attempt completes.

- **Distribution Overshoot Risk**: LLM detects when approaching limits (e.g., 28/30 Easy answered). It prevents selecting more Easy questions to avoid exceeding cap.

- **Cross-Attempt Staleness**: LLM has access to user's recent attempts. If pool is large, it avoids questions from last 2 attempts. If pool is small (<5 candidates), it allows repeats rather than blocking attempt start.

## Data Model

### New Tables (to be created in migration)

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
- `metadata` (jsonb):
  - `session_count` (int): number of times user resumed this attempt
  - `pause_count` (int): number of times user paused within this attempt
  - `time_spent_seconds` (int): cumulative time across all sessions for this attempt
  - `last_session_at` (timestamptz): last time user was active in this attempt

Indexes:

- `user_id, status` (find user's in-progress attempt)
- `completed_at DESC` (for recent completed attempts queries)

RLS: users can only read/write their own attempts.

**Important**: An attempt spans multiple sessions. `status='in_progress'` means the user has answered fewer than 60 questions, regardless of how many times they've paused and resumed.

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

Indexes:

- `attempt_id, question_order` (unique)
- `attempt_id, answered_at` (for progress queries)
- `question_id` (for cross-attempt lookups)

RLS: users can only access attempt_questions for their own attempts.

#### Reuse Existing `mcq_items` (Question Bank)

**Critical**: The `mcq_items` table serves as the **persistent question bank** that reduces LLM generation burden.

No schema changes needed. Existing columns (from `generation-of-questions.md` work-item) cover all requirements:

- `id` (uuid, primary key)
- `topic`, `subtopic`, `version` (categorization for LLM selector filtering)
- `difficulty` (Easy | Medium | Hard), `bloom_level` (Remember | Understand | Apply | Analyze | Evaluate | Create)
- `question` (text), `options` (jsonb array[4]), `correct_index` (int 0-3)
- `explanation` (text, 2-5 lines), `citations` (jsonb array of URLs)
- `code` (text, nullable, fenced code block for coding questions)
- `labels` (jsonb, additional metadata)
- `content_key` (text, unique hash for deduplication)
- `embedding` (vector(1536), for neighbor search)
- `created_at`, `user_id` (tracking)

Add computed column or query helper for `coding_mode`:

- Definition: `coding_mode = (code IS NOT NULL AND code != '')`
- Used by LLM selector to filter coding vs. non-coding questions

**Database-First Design**:

- Questions created during MCQ generation automation are stored here
- Questions generated on-demand during evaluation attempts are stored here
- All future attempts reuse questions from this shared bank
- Bank grows over time: initial seed (250-500) → organic growth (1000+)

### Optional: `user_evaluation_analytics`

Purpose: Precomputed aggregates for dashboard performance (optional optimization for v1.1).

Columns: `user_id`, `total_attempts`, `avg_score`, `topic_accuracy` (jsonb), `bloom_accuracy` (jsonb), `weak_areas` (jsonb), `last_updated_at`

Trigger: refresh on attempt completion.

## APIs

### 1. GET `/api/evaluate/attempts`

Purpose: List user's attempts with summary stats.

Query params:

- `status` (optional): filter by 'in_progress' | 'completed'
- `limit` (optional, default 10): pagination

Response:

```
{
  "attempts": [
    {
      "id": "uuid",
      "status": "completed",
      "questions_answered": 60,
      "correct_count": 42,
      "started_at": "ISO timestamp",
      "completed_at": "ISO timestamp"
    }
  ]
}
```

### 2. POST `/api/evaluate/attempts`

Purpose: Start a new evaluation attempt.

Request body: `{}` (empty; default config applies)

Response:

```
{
  "attempt_id": "uuid",
  "total_questions": 60,
  "status": "in_progress"
}
```

Creates `user_attempts` row and returns attempt ID.

### 3. GET `/api/evaluate/attempts/:id`

Purpose: Fetch attempt details with progress and next question. Invokes LLM selector to determine optimal next question based on attempt context.

Backend Logic:

1. Fetch attempt with all `attempt_questions` (questions already asked)
2. Compute current distribution (Easy/Medium/Hard counts, coding count, topic/subtopic/Bloom distribution)
3. Call LLM selector service with context to get target criteria
4. Query `mcq_items` for candidates matching LLM criteria
5. If sufficient candidates exist, select one; otherwise generate new question
6. Return attempt details + next question

Response:

```
{
  "attempt": {
    "id": "uuid",
    "status": "in_progress",
    "questions_answered": 14,
    "correct_count": 10,
    "total_questions": 60
  },
  "next_question": {
    "id": "uuid",
    "question": "What does useEffect do?",
    "options": ["A...", "B...", "C...", "D..."],
    "code": null,
    "metadata": {
      "topic": "React",
      "subtopic": "Hooks: useEffect",
      "difficulty": "Easy",
      "bloom_level": "Understand",
      "question_order": 15
    }
  }
}
```

If attempt is completed, `next_question` is null.

### 4. POST `/api/evaluate/attempts/:id/answer`

Purpose: Submit user's answer for current question. Records answer but does NOT reveal correctness.

Request body:

```
{
  "question_id": "uuid",
  "user_answer_index": 2,
  "time_spent_seconds": 45
}
```

Response:

```
{
  "recorded": true,
  "progress": {
    "questions_answered": 15,
    "total_questions": 60,
    "is_complete": false
  }
}
```

**Important**: Response does NOT include:

- `is_correct` flag
- `correct_index`
- `explanation`
- `citations`
- `correct_count` or score

These are only available after completing all 60 questions via the results endpoint.

Backend updates:

- Updates `attempt_questions` row: sets `user_answer_index`, `is_correct` (computed silently), `answered_at`, `time_spent_seconds`
- Updates `user_attempts` counters: increments `questions_answered`, updates `correct_count` (but not returned to client)
- If `questions_answered` reaches 60, sets `status='completed'` and `completed_at`

### 5. GET `/api/evaluate/attempts/:id/results`

Purpose: Fetch post-attempt analytics and review data. Only available after completing all 60 questions. This is the FIRST time users see their score, correctness feedback, explanations, and citations.

Response:

```
{
  "summary": {
    "total_questions": 60,
    "correct_count": 42,
    "score_percentage": 70,
    "time_spent_seconds": 3600
  },
  "topic_breakdown": [
    { "topic": "React", "correct": 10, "total": 15, "accuracy": 0.67 },
    { "topic": "JavaScript", "correct": 8, "total": 12, "accuracy": 0.67 }
  ],
  "subtopic_breakdown": [
    { "subtopic": "Hooks: useState", "correct": 5, "total": 6, "accuracy": 0.83 },
    { "subtopic": "Selectors/Memoization", "correct": 2, "total": 5, "accuracy": 0.40 }
  ],
  "bloom_breakdown": [
    { "bloom_level": "Remember", "correct": 12, "total": 15, "accuracy": 0.80 },
    { "bloom_level": "Apply", "correct": 18, "total": 25, "accuracy": 0.72 }
  ],
  "weak_areas": [
    {
      "subtopic": "Selectors/Memoization",
      "topic": "State Management",
      "accuracy": 0.40,
      "recommendation": "Review Redux Toolkit selectors and memoization patterns.",
      "citation": "https://redux-toolkit.js.org/..."
    }
  ],
  "questions": [
    {
      "question_order": 1,
      "question_text": "What does useState return?",
      "options": ["A...", "B...", "C...", "D..."],
      "user_answer_index": 1,
      "correct_index": 1,
      "is_correct": true,
      "explanation": "useState returns [state, setState].",
      "citations": ["https://react.dev/..."],
      "metadata": { "topic": "React", "subtopic": "Hooks: useState", "difficulty": "Easy", "bloom_level": "Remember" }
    }
  ]
}
```

### 6. PATCH `/api/evaluate/attempts/:id/pause`

Purpose: Pause and save current attempt state.

Request body: `{}`

Response:

```
{
  "status": "in_progress",
  "message": "Attempt paused. Resume anytime."
}
```

Updates `metadata.pause_count` and `metadata.session_count`.

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

Server-only functions for LLM-driven selection (add to existing file):

- `selectNextQuestion(attemptContext)`: LLM-driven selector
  - **Input**: Attempt context (questions asked, distributions, coverage)
  - **Output**: Target criteria (difficulty, coding_mode, preferred topics/subtopics/Bloom levels, reasoning)
  - **Model**: Use `gpt-4o-mini` with structured JSON output
  - **Prompt**: Encode distribution rules, diversity goals, and coverage heuristics
  - **Caching**: Consider caching LLM responses for similar contexts (optional optimization)

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

States:

- Loading next question
- Question displayed (awaiting answer)
- Answer submitted (brief "Answer recorded" confirmation, then immediately loads next question - no feedback)
- Attempt complete (redirect to results page)

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

#### `feedbackPanel.component.tsx`

Props: isCorrect, correctIndex, explanation, citations

Purpose: Display feedback in post-attempt results review ONLY. Not used during active attempt.

Renders: green/red feedback icon, correct answer highlight, explanation text (2–5 lines), citation links

#### `resultsChart.component.tsx`

Props: topicBreakdown or bloomBreakdown

Renders: bar chart or table showing accuracy per category

#### `weakAreasPanel.component.tsx`

Props: weakAreas (array of subtopic + recommendation)

Renders: list of weak areas with recommendation text and citation links

#### `questionReviewList.component.tsx`

Props: questions (array), filter controls

Renders: scrollable list of all questions with user's answer, correct answer, explanation

## Reusable Components from Generation Phase

**Key Insight**: We've already built several high-quality components during the MCQ generation work-item that can significantly accelerate evaluate page development. While these components don't have animations yet, their core functionality and structure are solid foundations.

### Available Components to Leverage

#### `components/generate/mcqCard.component.tsx`

- **What it does**: Displays MCQ question text (with code syntax highlighting), four options (A–D), correct answer marking, citations, and metadata chips
- **Reuse for evaluate**:
  - Adapt as the core `questionCard.component.tsx` for in-progress evaluation (hide correct answer/feedback during attempt)
  - Reuse directly in results review section (show correct answer and user's selection)
  - Code highlighting and option rendering already polished
  - Citation links already implemented
- **Modifications needed**:
  - Add props to control visibility of correct answer indicator (hide during attempt, show in results)
  - Add user answer highlighting (green if correct, red if incorrect) for results view
  - Simplify to remove edit/revision affordances (evaluate is read-only during attempt)
  - Add keyboard shortcuts (1–4 for options, Enter for submit)

#### `components/generate/automationModal.component.tsx`

- **What it does**: Modal for automation controls with coverage matrix placeholder
- **Reuse for evaluate**:
  - Adapt as onboarding/explainer modal for first-time users (explain 60-question structure, pause/resume, post-attempt feedback)
  - Inspiration for attempt history/summary modal (past attempts, scores, dates)
  - Modal transition patterns and layout can be reused
- **Modifications needed**:
  - Replace automation content with evaluation onboarding messaging
  - Consider creating a generic modal wrapper extracted from this component

#### `components/generate/personaPanel.component.tsx`

- **What it does**: Displays AI persona progress with streaming states
- **Reuse for evaluate**:
  - Pattern can inspire progress indicator component (questions answered, topics covered)
  - Visual treatment for step-by-step progress (Generation → Judge becomes Question 1 → Question 60)
  - State management patterns (pending/in-progress/complete) directly applicable
- **Modifications needed**:
  - Repurpose for question progress tracking instead of AI personas
  - Simplify to show linear progression (15/60) rather than branching workflow

#### `components/generate/revisionBox.component.tsx`

- **What it does**: Chat input with loading states and history
- **Reuse for evaluate**:
  - Not directly needed for v1 evaluate (no mid-attempt editing)
  - Could inspire future feature: post-attempt question flagging/feedback input
  - Loading state patterns useful for question loading indicators
- **Modifications needed**:
  - Defer to v1.1 if adding question flagging/reporting

### Shared Patterns & Utilities

- **Syntax highlighting setup**: Already configured in generation components (Shiki or similar); reuse exact configuration
- **Metadata chips rendering**: Topic, subtopic, difficulty, Bloom level chips already styled; copy directly
- **Citation link formatting**: Citation section with domain + title already built; adapt for results review
- **Code block wrapping**: Long words and newline handling already solved in `mcqCard.component.tsx` (noted in generation work-item tasks)
- **shadcn/ui patterns**: Consistent use of Button, Dialog, Card primitives established; maintain same patterns

### Implementation Strategy

1. **Start with `mcqCard`**: Copy and adapt as foundation for both in-progress `questionCard.component.tsx` and results `questionReviewList.component.tsx`
2. **Extract common MCQ rendering logic**: Create shared MCQ view component that accepts visibility flags (showCorrectAnswer, showUserAnswer, showExplanation)
3. **Reuse modal patterns**: Leverage automation modal structure for onboarding and results summary modals
4. **Maintain consistency**: Keep same visual treatment (fonts, spacing, color palette) across generation and evaluation features
5. **Add animations incrementally**: Start with functional components (no animations), then layer in Framer Motion transitions per UX guidelines below

### Development Acceleration Benefits

- **Faster initial build**: ~40% of UI components already exist in some form
- **Consistent UX**: Users moving between generation and evaluation see familiar patterns
- **Proven accessibility**: Generation components already handle keyboard nav and focus management
- **Reduced testing surface**: Reused components inherit existing QA coverage
- **Lower maintenance**: Shared components mean fewer files to update when patterns evolve

## Development Principles

**Core Philosophy**: Maximize reuse of existing codebase knowledge and patterns to accelerate development while maintaining code quality through SOLID, DRY, and KISS principles.

### Leverage Existing Codebase Knowledge

#### Services & API Patterns

- **Reuse API client architecture**: Follow patterns established in `services/mcq.services.ts` for new `services/evaluate.services.ts`
  - Axios clients with interceptors (already configured in `services/http.services.ts`)
  - TanStack Query hooks co-located with service functions
  - JSDoc comments (≥2 lines) for all API-facing functions
  - Example: `useSubmitAnswerMutation` follows same pattern as `useSaveMcqMutation`

#### Data Layer Patterns

- **Database conventions**: Follow existing table patterns from `mcq_items`, `documents`, `ingestions`
  - UUID primary keys
  - JSONB for flexible metadata/labels
  - RLS policies for user isolation
  - Created_at/updated_at timestamps
  - Example: `user_attempts` and `attempt_questions` should mirror `mcq_items` structure conventions

#### Utilities & Helpers

- **Reuse existing utils**: Don't recreate what exists
  - `utils/supabase.utils.ts`: Server/client helpers
  - `utils/json.utils.ts`: Safe JSON parsing for LLM responses
  - `utils/langchain.utils.ts`: Chunking patterns if needed for question content preprocessing
  - `constants/app.constants.ts`: Environment variables and feature flags

#### Type Definitions

- **Follow naming conventions** (from `specs/blueprints/directory-structure.md`):
  - Interfaces: prefix with `I` (e.g., `IAttempt`, `IAttemptQuestion`, `IAttemptResults`)
  - Types: prefix with `T` (e.g., `TAttemptStatus`, `TQuestionState`)
  - Enums: prefix with `E` (e.g., `EAttemptStatus`, `EQuestionDifficulty`)
- **Reuse existing enums**: `EDifficulty`, `EBloomLevel` from `types/mcq.types.ts` (don't duplicate)

### Apply SOLID Principles

#### Single Responsibility (S)

- **Component focus**: Each component does ONE thing well
  - `questionCard.component.tsx`: Render question only (no answer validation logic)
  - `feedbackPanel.component.tsx`: Display feedback only (no score calculation)
  - `resultsChart.component.tsx`: Visualize data only (no analytics computation)
- **Service separation**:
  - `evaluate.services.ts`: API client functions only (no business logic)
  - `ai.services.ts`: LLM selection logic only (reuse existing `selectNextQuestion` pattern)
  - Utilities handle pure functions (no side effects)

#### Open/Closed (O)

- **Extensible components**: Design for future enhancements without modifying existing code
  - `questionCard` accepts optional `mode` prop ('evaluation' | 'review') instead of two separate components
  - Question selection algorithm extensible for v1.1 adaptive difficulty without rewriting core logic
  - Analytics can add new metrics without changing results schema (use JSONB for extensibility)

#### Liskov Substitution (L)

- **Consistent interfaces**: Components with similar roles should be interchangeable
  - All modal components (onboarding, results, history) share same base props from `Dialog` primitive
  - All chart components (topic/subtopic/Bloom breakdown) implement same data visualization interface
  - TanStack Query hooks follow same signature patterns (queries return `{ data, isLoading, error }`)

#### Interface Segregation (I)

- **Minimal props**: Components receive only what they need
  - `questionCard` doesn't need full `attempt` object; pass `question`, `options`, `onSubmit` only
  - `resultsChart` doesn't need raw attempt data; pass pre-computed `breakdown` array only
  - `weakAreasPanel` doesn't need all analytics; pass `weakAreas` subset only

#### Dependency Inversion (D)

- **Abstract database access**: Components depend on service abstractions, not direct Supabase calls
  - Components call `useAttemptDetailsQuery` hook, not raw `supabase.from().select()`
  - LLM selector accepts `attemptContext` interface, not raw database rows
  - AI services inject embedding model config (already abstracted via `getEmbeddings`)

### Apply DRY (Don't Repeat Yourself)

#### Avoid Duplication

- **Extract shared logic**: If code appears 2+ times, extract to utility
  - Score calculation: Single `calculateAttemptScore(questions)` utility (don't inline in multiple places)
  - Label formatting: Reuse `formatTopic(topic)`, `formatBloomLevel(bloom)` from generation phase
  - Date/time formatting: Extract `formatAttemptDate`, `formatDuration` helpers

#### Reuse Existing Code

- **Database queries**: Abstract common patterns
  - Create `getUserAttempts(userId, filters)` helper (don't repeat query logic across endpoints)
  - Use existing `retrieval_hybrid_by_labels` RPC for question selection (don't rewrite similarity search)
  - Leverage existing `mcq_items` table (don't create duplicate question storage)

#### Component Composition

- **Build from primitives**: Compose shadcn/ui primitives, don't fork/duplicate
  - Use `<Dialog>` for all modals (onboarding, results, history) with different content
  - Use `<Card>` for question, summary, weak areas with consistent styling
  - Use `<Button>` with variants, not multiple custom button components

### Apply KISS (Keep It Simple, Stupid)

#### Simplicity First

- **Start simple, add complexity only when needed**:
  - v1: Fixed 60-question distribution (30/20/10); defer adaptive difficulty to v1.1
  - v1: LLM selector with simple heuristics; defer ML-based optimization to v1.2
  - v1: Basic charts (bar/table); defer fancy visualizations to v1.1
  - v1: No timed questions; defer per-question countdown to v1.1

#### Avoid Over-Engineering

- **Resist premature optimization**:
  - Use TanStack Query's default caching; tune only if performance issues observed
  - Use straightforward SQL queries; add materialized views only if N+1 queries become bottleneck
  - Use simple progress bar; defer skeleton loaders to v1.1 unless UX testing shows confusion

#### Clear Code Over Clever Code

- **Readability trumps cleverness**:
  - Explicit conditionals over ternary chains (if readability suffers)
  - Descriptive variable names: `questionsAnsweredCount` not `qac`
  - Comments for "why" not "what": Explain business rules, not obvious code
  - Avoid deep nesting: Early returns, guard clauses, extract functions at 3+ indent levels

### Implementation Checklist

Before writing new code, ask:

1. **DRY**: Does similar code already exist in generation, ingestion, or upload features?
2. **REUSE**: Can I adapt an existing component/service/utility instead of creating new?
3. **SOLID**: Does this component/function have a single, clear responsibility?
4. **KISS**: Is this the simplest solution that meets requirements, or am I over-engineering?
5. **CONVENTIONS**: Am I following project naming conventions (`.component.tsx`, `I` prefix for interfaces, etc.)?

### Code Review Focus Areas

When reviewing PRs for evaluate feature:

- **Duplication**: Flag any copy-pasted code blocks (should be extracted to utilities)
- **Complexity**: Challenge nested ternaries, deep conditionals, clever one-liners
- **Consistency**: Verify shadcn/ui patterns, Tailwind classes, file naming match existing code
- **Reusability**: Suggest extracting logic if component/function could benefit other features
- **Dependencies**: Question new npm packages if existing solutions suffice

## UX & Accessibility

### Design Principles

- **Mobile-first design**: Build all UI components with a mobile-first approach. Use responsive utilities to ensure the evaluation experience adapts gracefully across mobile phones, tablets, laptops, desktops, and TVs. Question cards, option buttons, progress indicators, and results charts must be fully functional and elegant on small screens first, then enhanced for larger viewports.
- **Clean evaluation experience**: No mid-attempt feedback. Users answer all 60 questions without knowing correctness, maintaining evaluation integrity.
- **Progress transparency**: Always show question count (15/60) but never score during attempt. Progress bar indicates completion percentage only.
- **Comprehensive post-attempt feedback**: After completion, provide detailed feedback (green/red indicators, explanations, citations) for all 60 questions.
- **Keyboard-first**: Support 1–4 keys for option selection, Enter for submit, Esc for pause.
- **Readable code**: Syntax highlighting (Shiki or Prism) with sufficient contrast; monospace font.
- **Mobile-responsive**: Question cards stack vertically; option buttons full-width on mobile.
- **Smooth animations**: Polished transitions that feel responsive without distraction; honor accessibility preferences.

### Motion & Animations

**Philosophy**: Animations should feel calm, professional, and supportive—never distracting from the evaluation task. Keep motion subtle to maintain focus while providing clear visual feedback.

#### Question Transitions (In-Progress Attempt)

- **Question enter/exit**: Smooth crossfade when moving to next question
  - Outgoing question: fade opacity 1→0 over 180ms with slight upward translate (-8px)
  - Incoming question: fade opacity 0→1 over 200ms with slight downward translate (8px→0)
  - Timing: stagger by 50ms (exit first, then entrance) for total ~250ms transition
  - Easing: ease-out for natural, snappy feel
- **"Answer recorded" confirmation**: Brief 1s toast with fade-in (120ms) and fade-out (150ms) using gentle ease-in-out
- **No heavy page transitions**: Avoid slide-in/slide-out that might feel jarring during focused evaluation

#### Progress Indicators

- **Progress bar fill**: Smooth width animation over 300ms with ease-out when advancing to next question
- **Question counter update**: Subtle fade-through animation (150ms fade-out old number, 150ms fade-in new number)
- **Percentage badge**: Scale slightly (0.96→1) over 180ms when incrementing to give subtle feedback

#### Interactive Elements (During Attempt)

- **Option selection**:
  - Hover: subtle background fade-in over 120ms
  - Active/selected: border color transition over 150ms, slight scale (0.98) on click with 100ms spring-back
  - Keyboard focus: smooth focus ring appearance over 120ms
- **Submit button**:
  - Hover: background color transition 180ms
  - Click: Brief scale-down (0.96) over 100ms, then return; disable during submission
  - Loading state: Smooth spinner fade-in after 200ms delay (avoid flash for fast responses)
- **Pause button**: Gentle background/color transitions on hover (180ms)

#### Results & Review Animations (Post-Attempt)

- **Summary reveal**: Orchestrated entrance sequence
  1. Hero score card: fade + scale up (0.95→1) over 280ms
  2. Celebration message: fade-in 200ms (start after 100ms delay)
  3. Breakdown sections: staggered fade + translate up (-12px→0) over 250ms, 80ms delay between items
  - Total orchestration: ~600ms for elegant, non-overwhelming reveal
- **Chart/gauge animations**: Smooth count-up and fill animations over 400–500ms with ease-out (feels satisfying without being slow)
- **Weak areas panel**: Fade-in with slight translate up over 200ms
- **Review list rendering**:
  - Initial load: First 20 items fade-in with micro-stagger (20ms per item) over 250ms
  - Lazy-load remaining: Fade-in new items over 200ms as user scrolls
  - Filter transitions: Smooth 180ms crossfade when toggling "Show Only Incorrect"
- **Correctness indicators**:
  - Green/red badges: Fade-in with slight scale (0.90→1) over 180ms
  - Explanation expand/collapse: Height animation with 250ms ease-in-out; opacity fade for content
- **Jump-to-question navigation**: Smooth scroll with 400ms ease-in-out; highlight target question with brief background pulse (fade-in 200ms, hold 600ms, fade-out 300ms)

#### Loading & State Transitions

- **LLM question selection delay**: If bank query + LLM selector takes >500ms
  - Show subtle loading indicator: fade-in spinner after 500ms delay, fade-out over 150ms when ready
  - Skeleton placeholder: Gentle shimmer animation for question card structure
  - Progress message: "Preparing question..." with fade-in after 800ms (only for rare generation cases)
- **Pause/Resume**: Modal fade-in/out over 200ms with backdrop opacity 0→0.6
- **Network retry**: Subtle pulse animation on retry button; status text fade-through transitions

#### Accessibility Considerations

- **Reduced motion**: When `prefers-reduced-motion: reduce` is detected:
  - Disable all translate/scale animations
  - Keep only simple opacity fades (still animated but gentler)
  - Instant progress bar updates (no width animation)
  - No orchestrated sequences (show all at once)
  - Maintain focus management without motion
- **No animation blocking**: Never block user interaction waiting for animations to complete
- **Focus states**: Always visible; use 120ms fade-in for smooth appearance without startling users

#### Implementation Guidelines

- **Libraries**: Use Framer Motion for complex orchestrations and presence animations; built-in CSS transitions for simple hover/active states
- **Performance**:
  - Animate only `opacity`, `transform` (translate/scale), and `filter` (blur for shimmer)
  - Avoid animating `width`/`height` (except progress bar which is acceptable)
  - Use `will-change` sparingly and only during active animations
  - Lazy-load Framer Motion chunks for results page (not needed during evaluation)
- **Testing**: Disable long animations in visual tests; verify reduced-motion fallbacks
- **Consistency**: Reuse timing constants across components (define in theme: `transition.fast=120ms`, `transition.base=180ms`, `transition.moderate=250ms`, `transition.slow=400ms`)

### Accessibility

- ARIA labels for all interactive elements (option buttons, submit, pause).
- Focus management: after submit, focus moves to next question's first option button.
- Screen reader announcements during attempt: "Answer recorded. Question 16 of 60." (no correctness feedback)
- Screen reader announcements in results: "Answer correct" or "Answer incorrect. Correct answer was B." (only after completion)
- Sufficient color contrast for feedback indicators in results review (WCAG AA minimum).
- Skip navigation: allow keyboard users to skip to question or results.
- Live region announcements for progress updates and completion.

## Quality & Safety

### Guardrails

- Validate question bank size before starting attempt; if insufficient, trigger batch generation (async job).
- Prevent double-submit: disable submit button after click until next question loads.
- Session recovery: persist attempt state to DB every 5 questions; on crash/reload, resume from last saved state.
- Time tracking: record per-question time; flag suspiciously fast answers (<3s) for analytics (no penalty in v1).

### Error Handling

- Generation failure: show error toast, offer retry or skip question (log for operator).
- Network timeout: retry answer submission with exponential backoff; persist locally if offline.
- Invalid attempt state: if attempt_questions count mismatch, reconcile or mark attempt as abandoned.

## Performance & Scalability

### Optimizations

- **Database-first question selection**: Retrieving questions from `mcq_items` takes ~10ms vs. LLM generation taking 5–10s. With a properly seeded bank (250–500 questions), 90%+ of attempts use only database queries, providing near-instant question delivery.
- **Question prefetching pipeline (1-3 ahead)**: Maintain a staggered prefetch pipeline to eliminate load time between questions:
  - **Trigger points**: (1) When question N loads, immediately prefetch N+1 (high priority); (2) When user selects an answer option (before submit), prefetch N+2 (medium priority opportunistically)
  - **Cache strategy**: Use TanStack Query's `prefetchQuery` with different `staleTime` values (5 min for N+1, 2 min for N+2) to balance freshness vs. availability
  - **Mutation integration**: On answer submission, the `onSuccess` callback prefetches N+2 (since N+1 should already be cached from prior trigger)
  - **Memory management**: Limit pipeline depth to 3 questions max; tune `gcTime` to 2 minutes for aggressive cleanup of unused questions with code blocks
  - **Fallback UX**: If network is slow and next question isn't ready, show subtle skeleton/spinner (should be <5% of transitions with proper prefetching)
  - **Context invalidation**: Prefetched questions remain valid despite attempt context changes (LLM selector is deterministic enough); only invalidate on pause/resume or API errors indicating context mismatch
- Cache recent questions: TanStack Query cache prevents redundant fetches on back/forward navigation.
- Batch analytics computation: compute topic/Bloom breakdowns on completion (not per question) to reduce DB load.
- Pagination in review: load first 20 questions in review list; lazy-load remaining 40 on scroll.
- LLM selector caching: Cache LLM selector decisions for similar contexts (e.g., "question 15, 12 Easy/2 Medium/1 Hard, 5 coding" → reuse criteria from previous attempt with same state).

### Scaling Considerations

- **Question bank growth strategy**:
  - **Phase 1 (Pre-launch)**: Pre-seed with 250–500 questions using automation
  - **Phase 2 (Launch – 3 months)**: Organic growth through on-demand generation when gaps exist (target: 600–800 questions)
  - **Phase 3 (3–6 months)**: Reach 1000+ questions; generation becomes extremely rare (<5% of attempts)
  - **Maintenance**: Periodic review and addition of questions for new topics/patterns identified from user attempts
  - Index `mcq_items` by (topic, subtopic, difficulty, coding_mode) and (difficulty, coding_mode, created_at DESC) for fast selection queries
- Concurrent users: rate-limit attempt creation (max 5 concurrent attempts per user).
- Analytics queries: consider materialized view for `user_evaluation_analytics` if user base grows beyond 10k.
- Bank size monitoring: Set up alerts if bank size falls below target (e.g., <200 questions or <5 questions in critical cells).

## Risks & Mitigations

### Risks

- **Insufficient question bank**: Starting with a small bank (<180 questions, 60×3 redundancy) causes frequent generation, high latency, and poor UX.
  - **Critical Mitigation**: Pre-seed bank with **250–500 high-quality questions before launch** using existing MCQ generation automation (from `generation-of-questions.md` work-item)
  - Block attempt start if bank < 100 questions across difficulty/topic distribution
  - Monitor bank coverage: aim for ≥10 questions per (topic × difficulty × coding_mode) combination
  - **Long-term goal**: Grow bank to 1000+ questions through organic generation and manual curation
- **Generation latency**: Real-time question generation takes 5–10s per question, frustrating users if frequent.
  - **Primary mitigation**: Database-first strategy ensures generation is rare after initial seeding
  - **Secondary mitigation**: Show "Preparing question..." loader with progress indicator if generation is needed
  - **Fallback**: If generation times out, relax criteria and retry; log incident for operator to add questions to bank later
- **Cross-attempt staleness**: Users retaking evaluation see identical questions, reducing learning value.
  - Mitigation: Soft cross-attempt exclusion (prefer questions not used in last 2 attempts)
  - As bank grows beyond 500 questions, repetition becomes less noticeable
  - Expand bank regularly through automation and manual addition of new questions

### Constraints

- **Coding mode threshold (35%)**: Requires sufficient coding questions in bank across topics/difficulties; may be hard to meet for niche subtopics.
  - Acceptance: Allow threshold miss if bank is limited; log shortfall for operator to prioritize coding question generation.

## Acceptance Criteria

- User can start a new evaluation attempt (Attempt #1, #2, #3, etc.) and see onboarding explainer (first-time only).
- System generates/selects 60 questions following distribution (30 Easy, 20 Medium, 10 Hard) and coding threshold (≥35%).
- No question repeats within a single 60-question attempt; cross-attempt repetition is minimized but not strictly prohibited.
- User can answer questions without receiving any feedback (correct/incorrect) during the attempt.
- System records answers silently and immediately loads next question after each submission.
- Progress bar shows questions answered (e.g., "22/60") but never shows score during attempt.
- User can pause mid-attempt (e.g., after 22/60 questions) and resume later from exact same point across multiple sessions.
- Progress persists: if user answers 15 questions Monday, 20 Wednesday, and 25 Friday, all are part of the same attempt.
- After completing all 60 questions in an attempt, user sees results summary with topic/subtopic/Bloom breakdowns for the FIRST time.
- Weak areas are highlighted with actionable recommendations and citation links.
- Review section displays all 60 questions with user's answer, correct answer, explanation (2–5 lines), and citations.
- Explanations and citations are visible ONLY in post-attempt results, never during the attempt.
- User can start unlimited new 60-question attempts; past completed attempts are accessible from dashboard with scores and dates.
- System tracks sessions per attempt (metadata.session_count increments each time user resumes an in-progress attempt).

## Automated Testing Strategy

### Mission Alignment

All tests validate the core mission: **users gain interview readiness** (confidence, clarity, identified gaps). Tests must ensure evaluation integrity, multi-session reliability, and actionable feedback delivery.

### Critical Test Coverage

#### 1. Evaluation Integrity (P0 - Blocking)

- **No mid-attempt feedback**: Verify users NEVER see correctness indicators, explanations, or score during 60-question flow
- **Progress transparency**: Only question count (22/60) visible during attempt, never score
- **First feedback at completion**: Results page is the FIRST time users see correct/incorrect answers

#### 2. Core User Journeys (End-to-End)

- **First-time attempt**: Onboarding → answer 60 questions → results with all analytics
- **Multi-session resume**: Answer 15 questions → pause → resume later → continue from question 16 → complete remaining 45
- **Unlimited attempts**: Complete Attempt #1 → start Attempt #2 → minimal repetition (if bank sufficient)

#### 3. Question Distribution & Quality

- **Distribution enforcement**: Exactly 30 Easy, 20 Medium, 10 Hard per attempt
- **Coding threshold**: Minimum 35% coding questions (≥21 of 60)
- **Topic balance**: No single topic exceeds 40% (≤24 questions)
- **Intra-attempt uniqueness**: All 60 questions are unique within same attempt
- **Cross-attempt soft exclusion**: Prefer new questions in subsequent attempts

#### 4. Data Persistence & Reliability

- **State survives reload**: Attempt state persists after page refresh
- **Network retry**: Answer submissions retry on failure with exponential backoff
- **Session timeout**: Auto-save state after 30 min idle; resume prompt on return

#### 5. Post-Attempt Results Validation

- **Weak areas clarity**: Panel shows specific subtopics, accuracy, and study recommendations
- **Explanation quality**: Each explanation is 2–5 lines with clear "why" and source citations
- **Citation validity**: All citation links are clickable and point to authoritative sources
- **Review completeness**: All 60 questions shown with user answer, correct answer, explanation, citations

#### 6. Accessibility (Interview Readiness for All)

- **Keyboard navigation**: Complete full attempt using only 1–4 keys (options), Enter (submit), Tab (navigation)
- **Screen reader announcements**: During attempt: "Answer recorded. Question 16 of 60." (no correctness). In results: "Answer correct/incorrect. Correct answer was B."
- **Color contrast**: Green/red feedback indicators meet WCAG AA (≥4.5:1)
- **Focus management**: Focus moves to next question's first option after submit

#### 7. Performance Benchmarks

- **Question latency**: < 500ms from submit to next question load (with prefetch pipeline)
- **Results load time**: < 2s from completing question 60 to results page display
- **Prefetch validation**: Next 1–3 questions cached during active attempt

#### 8. Visual Regression

- **Desktop profiles**: Landing page, question card, results summary, review section
- **Mobile profiles**: Question flow, option selection, results charts (responsive stacking)
- **Animation states**: Question transitions, progress updates (honor `prefers-reduced-motion`)

### Test Organization

```
tests/evaluate/
├── integrity/           # P0: No mid-feedback, post-only feedback
├── e2e/                 # Full user journeys (first-time, multi-session, unlimited)
├── distribution/        # 30/20/10, ≥35% coding, topic balance, uniqueness
├── reliability/         # Persistence, retry, session timeout
├── mission/             # Weak areas, explanations, citations (teaching effectiveness)
├── a11y/                # Keyboard, screen reader, contrast, focus
├── performance/         # Latency, load times, prefetch
└── visual/              # Desktop/mobile regression
```

### Execution Strategy

- **Pre-commit**: Smoke tests (integrity, first-attempt, keyboard nav) — 3–5 min
- **Pre-merge**: Full evaluate suite (all categories) — 15–20 min
- **Nightly**: Complete regression + visual snapshots + performance benchmarks

### Quality Gates

- **P0 Blocker**: Any mid-attempt feedback leak, uniqueness violation, or accessibility failure blocks merge
- **P1 High**: Distribution misses (30/20/10, 35% coding), multi-session failures, missing explanations/citations
- **P2 Medium**: Performance degradation >20%, visual regressions, cross-attempt high repetition

### Test Utilities

Centralize common operations in `tests/evaluate/helpers.ts`:

- `startAttempt()`: Navigate to `/evaluate`, start new attempt, return attemptId
- `answerQuestions(count, answers?)`: Select options and submit N questions
- `pauseAttempt()`: Click pause, verify state saved
- `resumeAttempt(attemptId)`: Load resume flow, verify correct question order
- `completeAttempt()`: Answer all 60 questions, wait for results page
- `verifyNoFeedback()`: Assert no correctness indicators/score visible
- `verifyResults(expectedScore)`: Validate results page completeness

## Tasks

- [ ] **Data Model**: Design and create migration for `user_attempts`, `attempt_questions` tables with RLS policies
- [ ] **API**: Implement `/api/evaluate/attempts` (GET, POST)
- [ ] **API**: Implement `/api/evaluate/attempts/:id` (GET, PATCH pause)
- [ ] **API**: Implement `/api/evaluate/attempts/:id/answer` (POST)
- [ ] **API**: Implement `/api/evaluate/attempts/:id/results` (GET)
- [ ] **Services**: Create `evaluate.services.ts` with client functions and TanStack Query hooks
- [ ] **AI Services**: Implement `selectNextQuestion` in `ai.services.ts` with LLM-driven selection logic
  - Design prompt template with distribution rules and coverage heuristics
  - Implement structured JSON output parsing (difficulty, coding_mode, preferred topics/subtopics/Bloom)
  - Add validation and fallback for invalid LLM responses
- [ ] **Selection Algorithm**: Implement question selection orchestration in API route
  - Gather attempt context (questions asked, distributions, coverage)
  - Call LLM selector to get target criteria
  - Query bank with LLM criteria, fallback to generation if needed
  - Handle edge cases (distribution caps, coding threshold enforcement)
- [ ] **UI**: Build evaluate landing page (`app/evaluate/page.tsx`) with start/resume flow
- [ ] **UI**: Build in-progress evaluation page (`app/evaluate/[attemptId]/page.tsx`) with question card and navigation
- [ ] **UI**: Build results page (`app/evaluate/[attemptId]/results/page.tsx`) with summary, charts, and review list
- [ ] **Components**: Create `questionCard.component.tsx` with syntax highlighting and option selection
- [ ] **Components**: Create `feedbackPanel.component.tsx` with correctness indicator and explanation
- [ ] **Components**: Create `resultsChart.component.tsx` for topic/Bloom accuracy visualization
- [ ] **Components**: Create `weakAreasPanel.component.tsx` with recommendations
- [ ] **Components**: Create `questionReviewList.component.tsx` with filtering
- [ ] **CRITICAL: Pre-seed Question Bank**: Generate and validate 250–500 questions before launch
  - Use existing MCQ generation automation from `generation-of-questions.md` work-item
  - Target distribution: 125–250 Easy, 85–170 Medium, 40–80 Hard
  - Ensure ≥35% are coding questions (88–175 coding questions)
  - Cover all topics: React, JavaScript, TypeScript, HTML, CSS, State Management, Routing, Testing, Accessibility, PWA
  - Aim for ≥10 questions per (topic × difficulty × coding_mode) cell where applicable
  - Validate each question: correct answer, clear explanation, valid citations
  - Store all questions in `mcq_items` database table
  - **Blocker**: Do not launch evaluate feature until bank has minimum 250 questions
- [ ] **QA: Bank Coverage**: Verify question bank coverage across all dimensions
  - Run query to check distribution: `SELECT difficulty, coding_mode, topic, COUNT(*) FROM mcq_items GROUP BY difficulty, coding_mode, topic`
  - Identify gaps and generate additional questions for under-represented cells
  - Test that LLM selector can find suitable questions for diverse attempt scenarios
- [ ] **QA**: Test multi-session resume (pause and restart); verify no state loss
- [ ] **QA**: Test 35% coding threshold enforcement across multiple attempts
- [ ] **QA**: Test database-first strategy: monitor how often generation is triggered vs. bank usage
- [ ] **QA**: Visual and accessibility checks (keyboard nav, ARIA labels, color contrast)
- [ ] **QA**: Verify no intra-attempt repeats; test cross-attempt exclusion logic
- [ ] **Monitoring**: Add metrics for bank usage vs. generation frequency
  - Track: `questions_from_bank_count`, `questions_generated_count`, `generation_latency_p95`
  - Alert if generation rate > 10% (indicates insufficient bank coverage)
- [ ] **Docs**: Update `specs/blueprints/existing-files.md` with new files created
- [ ] **Docs**: Add evaluate feature summary to `specs/blueprints/prd.md` (optional for v1.1 scope)
