/**
 * First-Time User Flow E2E Tests
 *
 * Tests the complete first-time user experience from landing to starting an evaluation.
 * Validates onboarding content, attempt creation, question answering, and pause functionality.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  startFreshAttempt,
  answerQuestion,
  getProgressInfo,
  assertNoCorrectnessFeedback,
  isResetButtonAvailable,
} from "../utils/testHelpers.utils";
import { EVALUATE_PAGE_LABELS } from "@/constants/evaluate.constants";

test.describe("First-Time User Flow", () => {
  test("should show onboarding content for first-time users", async ({ page }) => {
    // Navigate to evaluate page with no attempts
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Assert page title and description are visible
    await expect(page.locator("h1")).toContainText(EVALUATE_PAGE_LABELS.PAGE_TITLE);

    // Assert either "Start Evaluation" or "Resume Evaluation" button is present
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });

    // One of these buttons should be visible
    const hasStartButton = await startButton.isVisible();
    const hasResumeButton = await resumeButton.isVisible();

    expect(hasStartButton || hasResumeButton).toBe(true);
  });

  test("should create attempt and redirect to first question", async ({ page }) => {
    // Start new attempt
    const attemptId = await startNewAttempt(page);

    // Assert redirect to attempt page
    expect(page.url()).toMatch(/\/evaluate\/[a-f0-9-]+$/);
    expect(attemptId).toBeTruthy();

    // Assert first question loads with progress showing "Question 1 / 60"
    await expect(page.locator("[data-testid='progress-indicator']")).toContainText("Question 1 / 60");

    // Assert question card is visible
    await expect(page.locator("[data-testid='question-card']")).toBeVisible();

    // Assert question text is visible
    await expect(page.locator("[data-testid='question-text'] p").first()).toBeVisible();

    // Assert options are visible
    await expect(page.locator("[data-testid='option-button']")).toHaveCount(4);

    // Assert submit button is visible
    const submitButton = page.getByRole("button", { name: /submit.*answer/i });
    await expect(submitButton).toBeVisible();
  });

  test("should answer questions and verify progress updates", async ({ page }) => {
    // Start new attempt
    const attemptId = await startNewAttempt(page);

    const questionIds: string[] = [];

    // Answer 5 questions sequentially
    for (let i = 0; i < 5; i++) {
      // Get current question ID before answering
      const currentQuestionId = await page.getAttribute("[data-testid='question-card']", "data-question-id");
      if (currentQuestionId) {
        questionIds.push(currentQuestionId);
      }

      // Answer question
      await answerQuestion(page, i % 4); // Cycle through options 0-3

      // Assert progress updates
      const progress = await getProgressInfo(page);
      expect(progress.current).toBe(i + 1);
      expect(progress.total).toBe(60);

      // Assert no correctness feedback shown
      await assertNoCorrectnessFeedback(page);

      // Assert next question loads (if not the last question)
      if (i < 4) {
        await expect(page.locator("[data-testid='question-card']")).toBeVisible();
      }
    }

    // Assert all question IDs are different
    const uniqueIds = new Set(questionIds);
    expect(uniqueIds.size).toBe(questionIds.length);
  });

  test("should handle pause functionality correctly", async ({ page }) => {
    // Start new attempt and answer a few questions
    const attemptId = await startNewAttempt(page);

    // Answer 3 questions
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);
    }

    // Click pause button
    const pauseButton = page.getByRole("button", { name: /pause.*save/i });
    await expect(pauseButton).toBeVisible();
    await pauseButton.click();

    // Wait for redirect to landing page
    await page.waitForURL("/evaluate");
    await page.waitForLoadState("networkidle");

    // Assert "Resume Evaluation" button is now visible
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    await expect(resumeButton).toBeVisible();

    // Assert progress shows correct questions answered count
    const progressText = await page.locator("text=/\\d+\\s*\\/\\s*60/").textContent();
    expect(progressText).toContain("3 / 60");
  });

  test("should show loading states appropriately", async ({ page }) => {
    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Click start button and check for loading state
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });
    await startButton.click();

    // Should show loading state briefly
    await expect(page.locator("text=/Creating/")).toBeVisible({ timeout: 2000 });

    // Wait for redirect to attempt page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Assert question loads
    await expect(page.locator("[data-testid='question-card']")).toBeVisible();
  });

  test("should handle keyboard navigation", async ({ page }) => {
    // Start new attempt
    const attemptId = await startNewAttempt(page);

    // Test keyboard shortcuts (1-4 for options, Enter for submit)
    await page.keyboard.press("1"); // Select first option
    await page.keyboard.press("Enter"); // Submit answer

    // Wait for next question
    await expect(page.locator("[data-testid='question-card']")).toBeVisible();

    // Test option 2
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");

    // Verify progress updated
    const progress = await getProgressInfo(page);
    expect(progress.current).toBe(2);
  });

  test("should show appropriate error handling", async ({ page }) => {
    // Navigate to invalid attempt ID
    await page.goto("/evaluate/invalid-attempt-id");

    // Should show error message
    await expect(page.locator("text=/Attempt not found/")).toBeVisible();

    // Should show return button
    const returnButton = page.getByRole("button", { name: /return to evaluate/i });
    await expect(returnButton).toBeVisible();
  });

  test("should use reset button for test isolation when available", async ({ page }) => {
    // Check if reset button is available (dev mode)
    const resetAvailable = await isResetButtonAvailable(page);

    if (resetAvailable) {
      // Use startFreshAttempt which resets before starting
      const attemptId = await startFreshAttempt(page);

      // Verify we're on a fresh attempt page
      expect(page.url()).toMatch(/\/evaluate\/[a-f0-9-]+$/);
      expect(attemptId).toBeTruthy();

      // Verify no past attempts are shown
      const pastAttempts = page.locator("text=/Past Attempts/");
      await expect(pastAttempts).not.toBeVisible();
    } else {
      // Fall back to regular startNewAttempt if reset not available
      const attemptId = await startNewAttempt(page);
      expect(attemptId).toBeTruthy();
    }
  });
});
