/**
 * Multiple Attempts Flow E2E Tests
 *
 * Tests that users can complete multiple attempts and see attempt history.
 * Validates cross-attempt exclusion, attempt history display, and results navigation.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  compareQuestionSets,
  isResetButtonAvailable,
} from "../utils/testHelpers.utils";

type AttemptSummary = {
  id: string;
  status: string;
  score_percentage: number;
  started_at: string;
  completed_at: string | null;
};

type AttemptHistoryResponse = {
  attempts: AttemptSummary[];
};

test.describe("Multiple Attempts Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Reset attempts before each test for isolation (if reset button available)
    const resetAvailable = await isResetButtonAvailable(page);
    if (resetAvailable) {
      await page.goto("/evaluate");
      await page.waitForLoadState("networkidle");

      const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
      if (await resetButton.isVisible()) {
        await resetButton.click();

        // Handle confirmation dialog
        page.on("dialog", async (dialog) => {
          await dialog.accept();
        });

        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("should complete first attempt and start second attempt", async ({ page }) => {
    // Complete full 60-question attempt #1
    const attempt1Id = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    // Wait for results page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Navigate to evaluate landing page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Assert past attempts section shows completed attempt #1
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();

    // Click "Start New Evaluation"
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for new attempt page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Assert new attempt ID is different from attempt #1
    const attempt2Id = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];
    expect(attempt2Id).toBeTruthy();
    expect(attempt2Id).not.toBe(attempt1Id);
  });

  test("should have different questions in second attempt (cross-attempt soft exclusion)", async ({ page }) => {
    // Complete attempt #1 and collect all 60 question IDs
    const attempt1Id = await startNewAttempt(page);

    const attempt1QuestionIds: string[] = [];
    for (let i = 0; i < 60; i++) {
      const questionId = await page.getAttribute("[data-testid='question-card']", "data-question-id");
      if (questionId) {
        attempt1QuestionIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt1Id);

    // Navigate to evaluate page and start attempt #2
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const attempt2Id = await startNewAttempt(page);
    expect(page.url()).toContain(attempt2Id);

    // Answer 20 questions in attempt #2 and collect IDs
    const attempt2QuestionIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const questionId = await page.getAttribute("[data-testid='question-card']", "data-question-id");
      if (questionId) {
        attempt2QuestionIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Assert at least 15 of the 20 questions are different from attempt #1
    const comparison = compareQuestionSets(attempt1QuestionIds, attempt2QuestionIds);
    expect(comparison.overlapPercentage).toBeLessThan(25); // Less than 25% overlap
    expect(comparison.unique2).toBeGreaterThanOrEqual(15); // At least 15 unique questions
  });

  test("should show past attempts list with correct metadata", async ({ page }) => {
    // Complete 2 attempts
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt1Id);

    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const attempt2Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt2Id);

    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Assert past attempts section shows both attempts
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();

    // Get all past attempt cards
    const attemptCards = page.locator("div").filter({ hasText: /Completed/ });
    await expect(attemptCards).toHaveCount(2);

    // For each attempt, verify metadata
    for (let i = 0; i < 2; i++) {
      const attemptCard = attemptCards.nth(i);

      // Score percentage is displayed
      await expect(attemptCard.locator("text=/\\d+%/")).toBeVisible();

      // "X / 60" correct count is shown
      await expect(attemptCard.locator("text=/\\d+\\s*\\/\\s*60/")).toBeVisible();

      // Completed date is displayed
      await expect(attemptCard.locator("text=/Completed/")).toBeVisible();

      // Started date is displayed
      await expect(attemptCard.locator("text=/Started/")).toBeVisible();

      // "View Results" button is present
      const viewResultsButton = attemptCard.getByRole("button", { name: /view results/i });
      await expect(viewResultsButton).toBeVisible();
    }
  });

  test("should view results from past attempt", async ({ page }) => {
    // Complete attempt #1
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt1Id);

    // Start and complete attempt #2
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const attempt2Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt2Id);

    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Click "View Results" for attempt #1 (first in the list)
    const attemptCards = page.locator("div").filter({ hasText: /Completed/ });
    const firstAttemptCard = attemptCards.first();
    const viewResultsButton = firstAttemptCard.getByRole("button", { name: /view results/i });
    await viewResultsButton.click();

    // Assert redirect to attempt #1 results
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Assert results show data from attempt #1 (not attempt #2)
    // This is validated by the URL containing the attempt1Id
    expect(page.url()).toContain(attempt1Id);
  });

  test("should return all attempts from history API", async ({ page }) => {
    // Complete 3 attempts
    const attemptIds: string[] = [];

    for (let attempt = 0; attempt < 3; attempt++) {
      const attemptId = await startNewAttempt(page);
      attemptIds.push(attemptId);

      for (let i = 0; i < 60; i++) {
        await answerQuestion(page, i % 4);
      }
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
      expect(page.url()).toContain(attemptId);

      if (attempt < 2) {
        await page.goto("/evaluate");
        await page.waitForLoadState("networkidle");
      }
    }

    // Intercept attempts API call
    const attemptsResponse = await page.waitForResponse(/\/api\/evaluate\/attempts/);
    const attemptsData = (await attemptsResponse.json()) as AttemptHistoryResponse;
    const attempts = attemptsData.attempts ?? [];

    // Assert response contains array with 3 attempts
    expect(Array.isArray(attempts)).toBe(true);
    expect(attempts).toHaveLength(3);
    expect(new Set(attemptIds).size).toBe(3);
    const responseIds = attempts.map((attempt) => attempt.id);
    attemptIds.forEach((id) => expect(responseIds).toContain(id));

    // Assert attempts are ordered by most recent first
    const attemptDates = attempts.map((attempt) => new Date(attempt.started_at));
    for (let i = 0; i < attemptDates.length - 1; i++) {
      expect(attemptDates[i].getTime()).toBeGreaterThanOrEqual(attemptDates[i + 1].getTime());
    }

    // Verify each attempt has required fields
    attempts.forEach((attempt) => {
      expect(attempt).toHaveProperty("id");
      expect(attempt).toHaveProperty("status");
      expect(attempt).toHaveProperty("score_percentage");
      expect(attempt).toHaveProperty("started_at");
      expect(attempt).toHaveProperty("completed_at");
    });
  });

  test("should handle attempt history with no completed attempts", async ({ page }) => {
    // Navigate to evaluate page with no attempts
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Should not show past attempts section
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).not.toBeVisible();

    // Should show empty state or start new evaluation section
    const startSection = page.locator("text=/Start New Evaluation/");
    await expect(startSection).toBeVisible();
  });

  test("should maintain attempt isolation", async ({ page }) => {
    // Complete attempt #1
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt1Id);

    // Start attempt #2
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const attempt2Id = await startNewAttempt(page);
    expect(page.url()).toContain(attempt2Id);

    // Answer 10 questions in attempt #2
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);
    }

    // Pause attempt #2
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Should show resume for attempt #2, not attempt #1
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    await expect(resumeButton).toBeVisible();

    // Past attempts should show attempt #1
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();
  });

  test("should handle multiple attempts with different scores", async ({ page }) => {
    // Complete attempt #1 with mixed answers
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 2); // Only options 0 and 1
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    expect(page.url()).toContain(attempt1Id);

    // Start attempt #2 with different answers
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const attempt2Id = await startNewAttempt(page);
    expect(page.url()).toContain(attempt2Id);
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, (i % 2) + 2); // Only options 2 and 3
    }
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Both attempts should be visible with different scores
    const attemptCards = page.locator("div").filter({ hasText: /Completed/ });
    await expect(attemptCards).toHaveCount(2);

    // Each attempt should have a score
    for (let i = 0; i < 2; i++) {
      const attemptCard = attemptCards.nth(i);
      await expect(attemptCard.locator("text=/\\d+%/")).toBeVisible();
    }
  });
});
