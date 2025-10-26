# Evaluate Page - Playwright Testing Work Item

## Goal

Create comprehensive Playwright test coverage for the Evaluate page feature to ensure quality, reliability, and alignment with mission-critical requirements before production launch.

## Mission & Intent

**Core Mission**: Validate the 60-question evaluation feature meets all integrity constraints, user experience requirements, and performance benchmarks through systematic testing.

### Key Principles

- **Test user behavior, not implementation**: Focus on what users see and do, not internal state
- **Isolation**: Each test should be independent and able to run in any order
- **Realistic data**: Use production-like question distributions and content
- **Fast feedback**: P0 tests run in <5 minutes; full suite in <20 minutes
- **Maintainability**: DRY principles with shared fixtures and utilities

## Scope

### In Scope

- **P0 Blockers**: No mid-attempt feedback, intra-attempt uniqueness, distribution enforcement, keyboard accessibility
- **P1 High Priority**: Multi-session resume, cross-attempt soft exclusion, weak areas/explanations completeness, performance benchmarks
- **P2 Medium Priority**: Visual regression (desktop/mobile), animation states (prefers-reduced-motion)

### Out of Scope

- Load/stress testing (10k+ concurrent users)
- Payment integration tests (deferred to v1.2)
- Cross-browser testing beyond Chromium (Firefox/Safari deferred to post-launch)
- Manual exploratory testing (separate QA process)

## Test Organization Structure

All tests will be organized under `tests/evaluate/` with the following subdirectories:

```
tests/
  evaluate/
    integrity/          # P0: No mid-attempt feedback, uniqueness
    e2e/                # P0-P1: Complete user flows
    distribution/         # P0: 30/20/10, 35% coding, topic caps
    reliability/          # P1: Resume, exclusion, error handling
    mission/              # P1: Learning-first feedback, citations
    a11y/                 # P0: WCAG AA, keyboard nav, screen readers
    performance/          # P1: Transition speed, results load time
    visual/               # P2: Desktop/mobile snapshots
    fixtures/             # Shared test data, mocks, helpers
    utils/                # Test utilities and assertions
```

## Phase-by-Phase Development Plan

### Phase 0: Test Infrastructure Setup

**Goal**: Establish foundational test infrastructure, fixtures, and utilities before writing actual tests.

**Tasks**:

- Create `tests/evaluate/` directory structure with all subdirectories
- Set up shared fixtures:
  - `mockAttemptData.fixture.ts`: Sample attempt objects with various states
  - `mockQuestionData.fixture.ts`: Sample questions across all difficulties, topics, Bloom levels, coding modes
  - `mockResultsData.fixture.ts`: Sample results with topic/subtopic/Bloom breakdowns
- Create test utilities:
  - `testHelpers.utils.ts`: Common actions (startAttempt, answerQuestion, navigateToResults)
  - `customMatchers.utils.ts`: Domain-specific assertions (toHaveDistribution, toHaveNoDuplicates)
  - `apiMocks.utils.ts`: Reusable API response mocks
- Configure Playwright with:
  - Desktop and mobile profiles (already in `playwright.config.ts`)
  - Custom test timeout for long flows (90s for full 60-question attempts)
  - Screenshot/video capture on failure
  - Parallel execution settings
- Document testing conventions in `tests/README.md`

**Acceptance Criteria**:

- All subdirectories exist under `tests/evaluate/`
- Fixtures provide realistic data for all test scenarios
- Utilities enable DRY test authoring
- Configuration supports both desktop and mobile testing
- Documentation explains structure and conventions

---

### Phase 1: Integrity Tests (P0 Blockers)

**Goal**: Validate core integrity constraints that must never be violated.

**Test Files**:

- `tests/evaluate/integrity/no-mid-attempt-feedback.spec.ts`
- `tests/evaluate/integrity/intra-attempt-uniqueness.spec.ts`
- `tests/evaluate/integrity/progress-visibility.spec.ts`

**Test Scenarios**:

#### 1.1 No Mid-Attempt Feedback

- **Test**: User answers question correctly → no "correct" indicator shown
- **Test**: User answers question incorrectly → no "incorrect" indicator shown
- **Test**: Progress bar shows "15/60" but never shows score/percentage
- **Test**: After submitting answer, next question loads immediately without feedback
- **Test**: API response for answer submission does not include correctness field
- **Validation**: Inspect DOM for absence of correctness indicators; verify API response shape

#### 1.2 Intra-Attempt Uniqueness

- **Test**: Complete full 60-question attempt → verify all question IDs are unique
- **Test**: Resume mid-attempt → verify no question repeats from earlier in same attempt
- **Test**: Mock API to return duplicate question → verify frontend rejects or retries
- **Test**: Verify question content uniqueness → ensure no semantically similar questions appear in same attempt
- **Validation**: Collect all question IDs during attempt; assert Set size === 60
- **Note**: This is a critical integrity constraint - all 60 questions must be unique within a single attempt

#### 1.3 Progress Visibility

- **Test**: Progress bar updates correctly after each submission (1/60 → 2/60 → ... → 60/60)
- **Test**: Progress counter is visible and accurate throughout attempt
- **Test**: Progress bar never shows score or correctness percentage during attempt
- **Validation**: Check progress text and aria-valuenow attribute

#### 1.4 AI-Generated Question Pattern Detection

- **Test**: Detect synonym substitution patterns (purpose vs function vs benefit)
- **Test**: Detect structural reordering (same content, different word order)
- **Test**: Detect question type variations (what vs which vs how)
- **Test**: Detect tense/voice changes (active vs passive voice)
- **Test**: Detect negation patterns (positive vs negative phrasing)
- **Test**: Detect AI paraphrasing with multiple similarity methods
- **Test**: Detect concept overlap in different phrasings
- **Test**: Detect same technical concept with different wording
- **Test**: Detect same learning objective with different phrasing
- **Validation**: Multiple similarity detection methods (Jaccard, Cosine, Semantic, Pattern)
- **Note**: Critical for AI-generated content to prevent essentially identical questions with different wording

**Acceptance Criteria**:

- All tests pass with 100% reliability
- Tests run in <2 minutes total
- Clear failure messages when integrity violations occur

---

### Phase 2: End-to-End User Flows (P0-P1)

**Goal**: Validate complete user journeys from entry to results.

**Test Files**:

- `tests/evaluate/e2e/first-time-user.spec.ts`
- `tests/evaluate/e2e/resume-attempt.spec.ts`
- `tests/evaluate/e2e/complete-attempt.spec.ts`
- `tests/evaluate/e2e/multiple-attempts.spec.ts`

**Test Scenarios**:

#### 2.1 First-Time User Flow

- **Test**: Navigate to `/evaluate` → see onboarding explainer
- **Test**: Click "Start New Evaluation" → attempt created, redirected to first question
- **Test**: Answer 5 questions → verify progress updates, no feedback shown
- **Test**: Click "Pause & Save" → redirected to landing page with "Resume" button
- **Validation**: Check onboarding content, attempt creation API call, progress state

#### 2.2 Resume Attempt Flow

- **Test**: Start attempt, answer 10 questions, pause → resume → continue from question 11
- **Test**: Resume shows correct progress (10/60) and does not re-ask questions 1-10
- **Test**: Complete remaining 50 questions → results displayed
- **Validation**: Verify question_order continuity, no duplicates across pause/resume

#### 2.3 Complete Attempt Flow

- **Test**: Answer all 60 questions → redirected to results page
- **Test**: Results show score, topic/subtopic/Bloom breakdowns for FIRST time
- **Test**: Weak areas panel displays recommendations with citations
- **Test**: Review section shows all 60 questions with user/correct answers and explanations
- **Validation**: Check results API call, verify all sections render with correct data

#### 2.4 Multiple Attempts Flow

- **Test**: Complete attempt #1 → start attempt #2 → verify new attempt ID
- **Test**: Attempt #2 questions differ from attempt #1 (cross-attempt soft exclusion)
- **Test**: Landing page shows past attempts list with scores and dates
- **Validation**: Check attempt history API, verify question IDs differ across attempts

**Acceptance Criteria**:

- All critical user paths work end-to-end
- Tests cover happy path and pause/resume scenarios
- Tests run in <8 minutes total

---

### Phase 3: Distribution Validation (P0)

**Goal**: Ensure question distribution meets strict requirements.

**Test Files**:

- `tests/evaluate/distribution/difficulty-split.spec.ts`
- `tests/evaluate/distribution/coding-threshold.spec.ts`
- `tests/evaluate/distribution/topic-balance.spec.ts`
- `tests/evaluate/distribution/bloom-diversity.spec.ts`

**Test Scenarios**:

#### 3.1 Difficulty Split (30/20/10)

- **Test**: Complete 60-question attempt → verify 30 Easy, 20 Medium, 10 Hard
- **Test**: Mock bank with insufficient Hard questions → verify system generates to meet quota
- **Validation**: Count questions by difficulty; assert exact counts

#### 3.2 Coding Threshold (≥35%)

- **Test**: Complete attempt → verify ≥21 questions have coding_mode=true
- **Test**: Check that coding questions include code blocks in question or options
- **Validation**: Count questions with code blocks; assert ≥21

#### 3.3 Topic Balance (≤40% per topic)

- **Test**: Complete attempt → verify no single topic exceeds 24 questions
- **Test**: Mock bank with React-heavy distribution → verify selector enforces cap
- **Validation**: Count questions by topic; assert max ≤24

#### 3.4 Bloom Diversity (≥3 levels per difficulty tier)

- **Test**: Complete attempt → verify Easy tier has ≥3 Bloom levels
- **Test**: Verify Medium tier has ≥3 Bloom levels
- **Test**: Verify Hard tier has ≥3 Bloom levels
- **Validation**: Group questions by difficulty, count unique Bloom levels

**Acceptance Criteria**:

- All distribution constraints enforced
- Tests fail loudly when constraints violated
- Tests run in <3 minutes total

---

### Phase 4: Reliability & Error Handling (P1)

**Goal**: Validate system behavior under edge cases and failures.

**Test Files**:

- `tests/evaluate/reliability/multi-session-resume.spec.ts`
- `tests/evaluate/reliability/cross-attempt-exclusion.spec.ts`
- `tests/evaluate/reliability/api-failure-recovery.spec.ts`
- `tests/evaluate/reliability/idle-timeout.spec.ts`

**Test Scenarios**:

#### 4.1 Multi-Session Resume

- **Test**: Answer 20 questions → close browser → reopen → resume → verify state persists
- **Test**: Answer 40 questions → pause → wait 1 hour → resume → continue from question 41
- **Test**: Verify session_count increments in metadata
- **Validation**: Check localStorage/session persistence, metadata.session_count

#### 4.2 Cross-Attempt Exclusion

- **Test**: Complete attempt #1 → start attempt #2 → verify questions from last 2 attempts soft-excluded
- **Test**: Complete 3 attempts → verify attempt #3 questions differ from #1 and #2
- **Validation**: Compare question IDs across attempts; assert minimal overlap

#### 4.3 API Failure Recovery

- **Test**: Mock API failure on question fetch → verify error message, retry button
- **Test**: Mock API failure on answer submission → verify retry mechanism
- **Test**: Mock timeout on results fetch → verify loading state, fallback message
- **Validation**: Simulate network errors, verify graceful degradation

#### 4.4 Idle Timeout & Auto-Save

- **Test**: Answer 10 questions → idle for 30 minutes → verify auto-save triggered
- **Test**: Resume after auto-save → verify progress preserved
- **Validation**: Check auto-save timer, metadata.last_session_at

**Acceptance Criteria**:

- System handles failures gracefully without data loss
- Resume works reliably across sessions
- Tests run in <5 minutes total

---

### Phase 5: Mission Alignment (P1)

**Goal**: Validate adherence to learning-first principles and real interview conditions.

**Test Files**:

- `tests/evaluate/mission/learning-first-feedback.spec.ts`
- `tests/evaluate/mission/real-interview-conditions.spec.ts`
- `tests/evaluate/mission/actionable-insights.spec.ts`

**Test Scenarios**:

#### 5.1 Learning-First Feedback

- **Test**: Complete attempt → verify explanations are 2-5 lines and substantive
- **Test**: Verify all questions have citations (URLs/sections)
- **Test**: Verify explanations reference source material
- **Validation**: Check explanation length, citation presence, content quality

#### 5.2 Real Interview Conditions

- **Test**: Verify ≥35% coding questions (already in Phase 3)
- **Test**: Verify no mid-attempt feedback (already in Phase 1)
- **Test**: Verify Bloom diversity (already in Phase 3)
- **Validation**: Cross-reference with distribution tests

#### 5.3 Actionable Insights

- **Test**: Complete attempt with weak areas → verify recommendations are specific and actionable
- **Test**: Verify weak areas panel highlights subtopics with <60% accuracy
- **Test**: Verify recommendations include "study X" or "practice Y" guidance
- **Validation**: Check weak areas data structure, recommendation text quality

**Acceptance Criteria**:

- All questions have complete explanations and citations
- Weak areas provide actionable next steps
- Tests run in <3 minutes total

---

### Phase 6: Accessibility (P0)

**Goal**: Ensure WCAG AA compliance and keyboard-first usability.

**Test Files**:

- `tests/evaluate/a11y/keyboard-navigation.spec.ts`
- `tests/evaluate/a11y/screen-reader.spec.ts`
- `tests/evaluate/a11y/color-contrast.spec.ts`
- `tests/evaluate/a11y/focus-management.spec.ts`

**Test Scenarios**:

#### 6.1 Keyboard Navigation

- **Test**: Navigate through question options using Tab key → verify focus order
- **Test**: Select option using 1-4 keys → verify option selected
- **Test**: Submit answer using Enter key → verify submission
- **Test**: Pause attempt using Esc key → verify pause modal
- **Validation**: Simulate keyboard-only interaction, verify all actions accessible

#### 6.2 Screen Reader Support

- **Test**: Verify question text has proper ARIA labels
- **Test**: Verify progress bar has aria-valuenow, aria-valuemin, aria-valuemax
- **Test**: Verify option buttons have descriptive labels (not just "A", "B", "C", "D")
- **Test**: Verify results charts have ARIA descriptions
- **Validation**: Use @axe-core/playwright for automated checks

#### 6.3 Color Contrast (WCAG AA)

- **Test**: Verify all text meets 4.5:1 contrast ratio (normal text)
- **Test**: Verify large text meets 3:1 contrast ratio
- **Test**: Verify interactive elements (buttons, links) meet contrast requirements
- **Validation**: Use axe-core contrast checks

#### 6.4 Focus Management

- **Test**: After submitting answer, focus moves to next question
- **Test**: Opening pause modal traps focus within modal
- **Test**: Closing modal returns focus to trigger element
- **Validation**: Check document.activeElement after interactions

**Acceptance Criteria**:

- All pages pass axe-core automated checks (0 violations)
- Keyboard-only users can complete full evaluation
- Screen reader users receive clear announcements
- Tests run in <4 minutes total

---

### Phase 7: Performance (P1)

**Goal**: Validate performance benchmarks for smooth user experience.

**Test Files**:

- `tests/evaluate/performance/question-transitions.spec.ts`
- `tests/evaluate/performance/results-load-time.spec.ts`
- `tests/evaluate/performance/prefetch-effectiveness.spec.ts`

**Test Scenarios**:

#### 7.1 Question Transitions (<500ms)

- **Test**: Submit answer → measure time until next question fully rendered
- **Test**: Verify 90%+ of transitions complete in <500ms
- **Test**: Verify prefetching pipeline reduces transition time
- **Validation**: Use `performance.mark()` and `performance.measure()`

#### 7.2 Results Load Time (<2s)

- **Test**: Complete 60th question → measure time until results summary visible
- **Test**: Verify results page loads in <2s (p95)
- **Validation**: Measure time from navigation to content paint

#### 7.3 Prefetch Effectiveness

- **Test**: Verify N+1 question prefetched on question load
- **Test**: Verify N+2 question prefetched on option select
- **Test**: Verify prefetch cache hit rate >90%
- **Validation**: Monitor network requests, check TanStack Query cache

**Acceptance Criteria**:

- 90%+ of question transitions <500ms
- Results page loads in <2s
- Prefetch pipeline demonstrably improves transition speed
- Tests run in <3 minutes total

---

### Phase 8: Visual Regression (P2)

**Goal**: Catch unintended visual changes across desktop and mobile.

**Test Files**:

- `tests/evaluate/visual/desktop-snapshots.spec.ts`
- `tests/evaluate/visual/mobile-snapshots.spec.ts`
- `tests/evaluate/visual/animation-states.spec.ts`

**Test Scenarios**:

#### 8.1 Desktop Snapshots

- **Test**: Capture landing page (no attempt, active attempt, past attempts)
- **Test**: Capture question page (easy/medium/hard, with/without code)
- **Test**: Capture results page (summary, charts, weak areas, review list)
- **Validation**: Compare against baseline screenshots

#### 8.2 Mobile Snapshots

- **Test**: Capture same pages as desktop on Pixel 7 profile
- **Test**: Verify responsive layout differences (stacked vs. side-by-side)
- **Validation**: Compare against mobile baselines

#### 8.3 Animation States

- **Test**: Capture question transition mid-animation
- **Test**: Verify prefers-reduced-motion disables animations
- **Test**: Capture results summary orchestration sequence
- **Validation**: Check animation timings, reduced-motion fallbacks

**Acceptance Criteria**:

- Baseline screenshots established for all key pages
- Visual diffs highlight only intentional changes
- Reduced-motion mode works correctly
- Tests run in <5 minutes total

---

## Test Execution Strategy

### Pre-Commit (Smoke Tests)

Run subset of P0 tests locally before committing:

- No mid-attempt feedback
- Intra-attempt uniqueness
- Basic E2E flow (start → answer 5 → pause)
- **Target**: <3 minutes

### Pre-Merge (Full Suite)

Run all tests in CI before merging to main:

- All P0 and P1 tests
- Accessibility checks
- Performance benchmarks
- **Target**: <20 minutes

### Nightly (Regression + Visual)

Run extended suite including:

- Full 60-question attempts
- Cross-attempt exclusion over 3+ attempts
- Visual regression with baseline updates
- **Target**: <45 minutes

## Test Data Management

### Mock Data Strategy

- **Fixtures**: Pre-defined question sets covering all dimensions (difficulty, topic, Bloom, coding)
- **Factories**: Generate randomized but valid questions for distribution tests
- **Seeding**: Seed database with 250+ questions before test runs to simulate production bank

### API Mocking

- **When to mock**: Flaky external dependencies (OpenAI, Supabase edge cases)
- **When NOT to mock**: Core evaluation APIs (test real backend)
- **Tools**: Playwright `page.route()` for selective mocking

## Monitoring & Reporting

### Test Metrics to Track

- **Pass rate**: Target 100% for P0, 95%+ for P1/P2
- **Flakiness**: <2% flake rate across all tests
- **Execution time**: Track per-phase and total suite time
- **Coverage**: Aim for 90%+ coverage of critical paths

### Reporting

- **CI**: GitHub Actions with Playwright HTML reporter
- **Failures**: Screenshots, videos, traces attached to failed runs
- **Trends**: Track pass rate and execution time over time

## Dependencies & Prerequisites

### Required Before Testing

- Supabase database with migrations applied (012, 013)
- Question bank seeded with ≥250 questions
- OpenAI API key configured (for generation fallback tests)
- Dev server running on `http://localhost:3050`

### Test Data Management

- **Reset Between Test Runs**: Use the dev reset button on `/evaluate` page (only available when `DEV_DEFAULT_USER_ID` is set) to clear all attempts before running tests
- **Isolation**: Each test should create its own attempt and not rely on existing data
- **Cleanup**: Tests should not leave orphaned attempts, but the reset button provides a safety net

### Playwright Setup

- Install Playwright: `pnpm add -D @playwright/test`
- Install browsers: `pnpm exec playwright install`
- Install axe-core: `pnpm add -D @axe-core/playwright`

## Risk Mitigation

### Potential Risks

1. **Flaky tests due to async operations**: Mitigate with `expect.poll()` and proper waits
2. **Long test execution times**: Parallelize tests, optimize data seeding
3. **Visual regression false positives**: Use threshold tolerance, disable animations in snapshots
4. **Test data pollution**: Isolate tests with unique user IDs, clean up after runs

## Current Status

### ✅ Phase 0: Infrastructure Complete

- All test infrastructure created (directories, fixtures, utilities, documentation)
- Playwright configuration updated with proper timeouts and reporting
- Test helpers and custom matchers implemented
- Comprehensive documentation in `tests/README.md`

### ✅ Phase 1: Integrity Tests Written

- All 3 integrity test files created with comprehensive test scenarios
- Tests cover no mid-attempt feedback, intra-attempt uniqueness, and progress visibility
- Custom matchers for domain-specific assertions
- Mock data fixtures for realistic testing

### ✅ Evaluate Page Implemented

- Evaluate page is now working with "Resume Evaluation" button
- Tests can successfully navigate to attempt pages
- **4 tests passing** (API response validation tests)
- Test infrastructure is working correctly with real UI

### ✅ Reset Button Test Accommodation Complete

- Added comprehensive reset button test support to test helpers
- Created dedicated reset button test scenarios in `tests/evaluate/reliability/reset-button.spec.ts`
- Updated existing tests to use reset functionality for better test isolation
- Enhanced test documentation with reset button usage instructions
- Tests now automatically use reset button when available (dev mode)

### ✅ Test Infrastructure Enhancements

- **Test Helpers Enhanced**: Added `resetAllAttempts()`, `isResetButtonAvailable()`, and `startFreshAttempt()` functions
- **Test Isolation Improved**: Tests now automatically reset attempts when running in dev mode
- **Documentation Updated**: Comprehensive reset button usage instructions added to `tests/README.md`
- **Error Handling**: Tests gracefully handle both dev and production modes
- **Comprehensive Coverage**: Reset button functionality thoroughly tested with edge cases

### ⚠️ Current Issues: Test Selectors Need Updates

- Tests are failing due to selector mismatches with actual UI
- Need to update test helpers to match actual DOM structure
- Progress format shows "15% complete" instead of "15/60" format
- Question ID extraction needs different selectors
- Some tests expect different button text/behavior

### Next Steps Required

1. **Update Test Selectors**: Fix test helpers to match actual UI elements
2. **Update Progress Format**: Tests expect "X/60" but UI shows "X% complete"
3. **Fix Question ID Extraction**: Update selectors for question identification
4. **Update Button Selectors**: Fix submit button and option button selectors
5. **Run Full Test Suite**: Execute all Phase 1 tests after selector fixes

### Current Test File Status

**✅ Completed Test Files:**

- `tests/evaluate/integrity/no-mid-attempt-feedback.spec.ts`
- `tests/evaluate/integrity/intra-attempt-uniqueness.spec.ts`
- `tests/evaluate/integrity/progress-visibility.spec.ts`
- `tests/evaluate/integrity/ai-question-patterns.spec.ts`
- `tests/evaluate/e2e/first-time-user.spec.ts`
- `tests/evaluate/e2e/resume-attempt.spec.ts`
- `tests/evaluate/e2e/complete-attempt.spec.ts`
- `tests/evaluate/e2e/multiple-attempts.spec.ts`
- `tests/evaluate/reliability/reset-button.spec.ts`

**📝 Test Infrastructure:**

- `tests/evaluate/utils/testHelpers.utils.ts` (enhanced with reset functionality)
- `tests/evaluate/utils/customMatchers.utils.ts`
- `tests/evaluate/fixtures/mockAttemptData.fixture.ts`
- `tests/evaluate/fixtures/mockQuestionData.fixture.ts`
- `tests/README.md` (updated with reset button documentation)

**⏳ Pending Test Files:**

- Distribution validation tests (Phase 3)
- Additional reliability tests (Phase 4)
- Mission alignment tests (Phase 5)
- Accessibility tests (Phase 6)
- Performance tests (Phase 7)
- Visual regression tests (Phase 8)

## Success Criteria

### Definition of Done

- All 8 phases completed with tests passing
- P0 tests run in <5 minutes
- Full suite runs in <20 minutes
- 0 known flaky tests
- Documentation complete (README, inline comments)
- CI integration configured

### Launch Readiness

- All P0 tests passing at 100%
- All P1 tests passing at 95%+
- Accessibility audit shows 0 critical violations
- Performance benchmarks met (<500ms transitions, <2s results)
- Visual regression baselines approved

## Future Enhancements (Post-Launch)

- Cross-browser testing (Firefox, Safari)
- Load testing (10k+ concurrent users)
- Mobile app testing (React Native)
- Internationalization testing (multiple locales)
- Payment integration tests (v1.2)

---

## Tasks

### Phase 0: Infrastructure

- [x] Create `tests/evaluate/` directory structure
- [x] Set up shared fixtures (mockAttemptData, mockQuestionData, mockResultsData)
- [x] Create test utilities (testHelpers, customMatchers, apiMocks)
- [x] Configure Playwright for desktop/mobile profiles
- [x] Document testing conventions in `tests/README.md`

### Phase 1: Integrity Tests

- [x] Write no-mid-attempt-feedback.spec.ts
- [x] Write intra-attempt-uniqueness.spec.ts
- [x] Write progress-visibility.spec.ts
- [x] Write ai-question-patterns.spec.ts
- [ ] **BLOCKED**: Verify all integrity tests pass (requires evaluate page implementation)

### Phase 2: E2E Flows

- [x] Write first-time-user.spec.ts
- [x] Write resume-attempt.spec.ts
- [x] Write complete-attempt.spec.ts
- [x] Write multiple-attempts.spec.ts
- [ ] **BLOCKED**: Verify all E2E tests pass (requires selector updates)

### Phase 3: Distribution Validation

- [ ] Write difficulty-split.spec.ts
- [ ] Write coding-threshold.spec.ts
- [ ] Write topic-balance.spec.ts
- [ ] Write bloom-diversity.spec.ts
- [ ] Verify all distribution tests pass

### Phase 4: Reliability

- [ ] Write multi-session-resume.spec.ts
- [ ] Write cross-attempt-exclusion.spec.ts
- [ ] Write api-failure-recovery.spec.ts
- [ ] Write idle-timeout.spec.ts
- [x] Write reset-button.spec.ts
- [ ] Verify all reliability tests pass

### Phase 5: Mission Alignment

- [ ] Write learning-first-feedback.spec.ts
- [ ] Write real-interview-conditions.spec.ts
- [ ] Write actionable-insights.spec.ts
- [ ] Verify all mission tests pass

### Phase 6: Accessibility

- [ ] Write keyboard-navigation.spec.ts
- [ ] Write screen-reader.spec.ts
- [ ] Write color-contrast.spec.ts
- [ ] Write focus-management.spec.ts
- [ ] Verify all a11y tests pass with 0 violations

### Phase 7: Performance

- [ ] Write question-transitions.spec.ts
- [ ] Write results-load-time.spec.ts
- [ ] Write prefetch-effectiveness.spec.ts
- [ ] Verify all performance benchmarks met

### Phase 8: Visual Regression

- [ ] Write desktop-snapshots.spec.ts
- [ ] Write mobile-snapshots.spec.ts
- [ ] Write animation-states.spec.ts
- [ ] Establish and approve visual baselines

### CI/CD Integration

- [ ] Configure GitHub Actions workflow for test execution
- [ ] Set up pre-commit smoke tests
- [ ] Set up pre-merge full suite
- [ ] Set up nightly regression + visual tests
- [ ] Configure test reporting and notifications

### Documentation & Launch

- [x] Complete all test documentation
- [x] Update documentation with reset button usage
- [ ] Review and approve visual regression baselines
- [ ] Conduct final QA review
- [ ] Mark feature as launch-ready
