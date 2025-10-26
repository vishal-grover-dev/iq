# Evaluate Page Testing

This directory contains comprehensive Playwright tests for the evaluate page feature, focusing on integrity constraints, user experience, and performance validation.

## Test Structure

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

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test:e2e

# Run tests with UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/evaluate/integrity/no-mid-attempt-feedback.spec.ts

# Run tests in headed mode (see browser)
pnpm test:e2e --headed

# Run tests with debug mode
pnpm test:e2e --debug
```

### Test Execution Strategies

**Pre-Commit (Smoke Tests)**

```bash
# Run P0 integrity tests only
pnpm test:e2e tests/evaluate/integrity/
```

**Pre-Merge (Full Suite)**

```bash
# Run all P0 and P1 tests
pnpm test:e2e tests/evaluate/integrity/ tests/evaluate/e2e/ tests/evaluate/distribution/
```

**Nightly (Regression + Visual)**

```bash
# Run full suite including visual tests
pnpm test:e2e
```

## Test Utilities

### Helper Functions (`utils/testHelpers.utils.ts`)

```typescript
import { startNewAttempt, answerQuestion, getProgressInfo } from "./utils/testHelpers.utils";

// Start a new attempt
const attemptId = await startNewAttempt(page);

// Answer a question
await answerQuestion(page, 0); // Select first option

// Get current progress
const progress = await getProgressInfo(page);
```

### Custom Matchers (`utils/customMatchers.utils.ts`)

```typescript
import { toHaveUniqueQuestionIds, toHaveDistribution } from "./utils/customMatchers.utils";

// Assert question IDs are unique
await toHaveUniqueQuestionIds(questionIds);

// Assert difficulty distribution
await toHaveDistribution(questions, {
  easy: 30,
  medium: 20,
  hard: 10,
  coding: 21,
});
```

## Test Data

### Fixtures (`fixtures/`)

- **`mockAttemptData.fixture.ts`**: Sample attempt objects in various states
- **`mockQuestionData.fixture.ts`**: Sample questions across all dimensions

### Using Fixtures

```typescript
import { mockInProgressAttempt10, mockCompletedAttempt } from "./fixtures/mockAttemptData.fixture";
import { mockEasyReactQuestion, mockQuestionCollection } from "./fixtures/mockQuestionData.fixture";

// Use fixture data for assertions
expect(attempt.status).toBe(mockInProgressAttempt10.status);
```

## Test Scenarios

### Phase 1: Integrity Tests (P0 Blockers)

**No Mid-Attempt Feedback**

- Verify no correctness indicators during attempt
- Assert progress shows count only (X/60)
- Validate API responses exclude correctness fields

**Intra-Attempt Uniqueness**

- Ensure all 60 questions have unique IDs
- Verify resume doesn't repeat questions
- Check content uniqueness (no similar questions)

**Progress Visibility**

- Assert progress updates after each submission
- Verify accessibility attributes
- Check no score display during attempt

### Test Execution Time Targets

- **Phase 1 tests**: <2 minutes total
- **Individual test files**: <1 minute each
- **Full suite**: <20 minutes
- **Smoke tests**: <3 minutes

## Debugging Tips

### Common Issues

1. **Tests timing out**: Increase timeout in `playwright.config.ts`
2. **Elements not found**: Check for proper `data-testid` attributes
3. **API failures**: Verify dev server is running on port 3050
4. **Database issues**: Ensure Supabase connection is configured

### Debug Commands

```bash
# Run with debug mode
pnpm test:e2e --debug

# Run specific test with trace
pnpm test:e2e tests/evaluate/integrity/no-mid-attempt-feedback.spec.ts --trace on

# Generate test report
pnpm test:e2e --reporter=html
```

### Test Data Management

- Tests use the **real dev database** (no seeding required)
- Questions are selected from the existing question bank
- Tests validate actual API behavior, not mocked responses
- Only edge cases (duplicates, failures) use mocking

## Resetting Test Data

When running tests locally with `DEV_DEFAULT_USER_ID`, you may accumulate test attempts in the database. The test suite now includes automatic reset functionality for better test isolation.

### Automatic Reset in Tests

The test suite includes helper functions that automatically use the reset button when available:

```typescript
import { startFreshAttempt, resetAllAttempts, isResetButtonAvailable } from "./utils/testHelpers.utils";

// Start a fresh attempt (resets first if possible)
const attemptId = await startFreshAttempt(page);

// Check if reset is available
const resetAvailable = await isResetButtonAvailable(page);

// Manually reset all attempts
await resetAllAttempts(page);
```

### Manual Reset Options

### Option 1: UI Reset Button (Recommended)

1. Ensure `DEV_DEFAULT_USER_ID` is set in your `.env.local`
2. Navigate to `/evaluate` in your browser
3. Click the yellow "Reset All Attempts" button in the dev mode banner
4. Confirm the deletion

### Option 2: API Call

```bash
curl -X DELETE http://localhost:3050/api/evaluate/attempts/reset
```

### Option 3: Database Query

```sql
DELETE FROM attempt_questions WHERE attempt_id IN (
  SELECT id FROM user_attempts WHERE user_id = 'your-dev-user-id'
);
DELETE FROM user_attempts WHERE user_id = 'your-dev-user-id';
```

**Note**: The reset endpoint only works for `DEV_DEFAULT_USER_ID` and will return 403 for other users.

### Reset Button Test Coverage

The reset button functionality is thoroughly tested in `tests/evaluate/reliability/reset-button.spec.ts`:

- **Visibility**: Only shown in dev mode when `DEV_DEFAULT_USER_ID` is set
- **Confirmation**: Proper dialog handling with accept/cancel options
- **Loading states**: Button shows "Resetting..." during operation
- **Error handling**: Graceful handling of API failures
- **Data clearing**: Complete removal of all attempts and related data
- **UI updates**: Proper state updates after reset completion

### Environment Setup

1. **Dev server running**: `pnpm dev` on port 3050
2. **Database accessible**: Supabase connection configured
3. **Question bank populated**: Existing questions in `mcq_items` table
4. **Environment variables**: `DEV_DEFAULT_USER_ID` set for testing

## Test Organization

### By Priority

- **P0 (Blockers)**: Must pass before any deployment
- **P1 (High)**: Should pass before production release
- **P2 (Medium)**: Nice to have, can be addressed post-launch

### By Type

- **Integrity**: Core constraints that must never be violated
- **E2E**: Complete user journeys
- **Distribution**: Question selection and balance
- **Reliability**: Error handling and edge cases
- **Accessibility**: WCAG compliance and keyboard navigation
- **Performance**: Speed and responsiveness benchmarks

## Best Practices

1. **Use real backend**: Test actual API behavior, not mocks
2. **Test user behavior**: Focus on what users see and do
3. **Isolation**: Each test should be independent
4. **Realistic data**: Use production-like question distributions
5. **Fast feedback**: Optimize for quick test execution
6. **Maintainability**: DRY principles with shared utilities

## Troubleshooting

### Test Failures

1. **Check test output**: Look for specific error messages
2. **Verify environment**: Ensure dev server and database are accessible
3. **Review test data**: Check if questions exist in the database
4. **Check timing**: Some tests may need longer timeouts

### Performance Issues

1. **Parallel execution**: Tests run in parallel by default
2. **Test isolation**: Each test should clean up after itself
3. **Database state**: Tests should not depend on specific database state
4. **Network timeouts**: Adjust timeouts for slow network conditions

## Contributing

When adding new tests:

1. **Follow naming conventions**: `*.spec.ts` for test files
2. **Use shared utilities**: Leverage existing helper functions
3. **Add proper assertions**: Use custom matchers where appropriate
4. **Document test purpose**: Add clear descriptions for complex scenarios
5. **Consider performance**: Optimize for fast execution
