/**
 * No Mid-Attempt Feedback Tests - Fresh Attempt Version
 *
 * This version creates a completely fresh attempt to avoid corrupted state issues
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  getProgressInfo,
  assertNoCorrectnessFeedback,
  assertProgressFormat,
  resetAllAttempts,
} from "../utils/testHelpers.utils";

test.describe("No Mid-Attempt Feedback", () => {
  test.beforeEach(async ({ page }) => {
    // Reset all attempts before each test to ensure clean state
    await resetAllAttempts(page);
  });

  test("should not show correctness indicators after correct answer", async ({ page }) => {
    // Start fresh attempt
    const attemptId = await startNewAttempt(page);
    expect(attemptId).toBeTruthy();

    // Answer first question correctly (assuming option 0 is correct)
    await answerQuestion(page, 0);

    // Verify no correctness feedback is shown
    await assertNoCorrectnessFeedback(page);

    // Verify progress is shown correctly
    await assertProgressFormat(page, 1);
  });

  test("should not show correctness indicators after incorrect answer", async ({ page }) => {
    // Start fresh attempt
    const attemptId = await startNewAttempt(page);
    expect(attemptId).toBeTruthy();

    // Answer first question incorrectly (assuming option 1 is incorrect)
    await answerQuestion(page, 1);

    // Verify no correctness feedback is shown
    await assertNoCorrectnessFeedback(page);

    // Verify progress is shown correctly
    await assertProgressFormat(page, 1);
  });

  test("should show progress in correct format", async ({ page }) => {
    // Start fresh attempt
    const attemptId = await startNewAttempt(page);
    expect(attemptId).toBeTruthy();

    // Answer a few questions
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);
      await assertProgressFormat(page, i + 1);
    }
  });

  test("should not show score information during attempt", async ({ page }) => {
    // Start fresh attempt
    const attemptId = await startNewAttempt(page);
    expect(attemptId).toBeTruthy();

    // Answer a question
    await answerQuestion(page, 0);

    // Verify no score information is visible
    const scoreElements = page.locator("text=/score|grade|percentage|\\d+%|\\d+\\/\\d+.*score/i");
    const scoreCount = await scoreElements.count();
    expect(scoreCount).toBe(0);
  });
});
