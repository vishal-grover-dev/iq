/**
 * Integrity Test: No Mid-Attempt Feedback
 *
 * Validates that users receive no correctness feedback during the evaluation.
 * This is a critical P0 constraint that must never be violated.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  getProgressInfo,
  assertNoCorrectnessFeedback,
  assertProgressFormat,
  waitForApiResponse,
} from "../utils/testHelpers.utils";
import { toHaveValidApiResponse, toHaveNoScoreDisplay } from "../utils/customMatchers.utils";
import { EVALUATE_PAGE_LABELS, QUESTION_CARD_LABELS } from "@/constants/evaluate.constants";

test.describe("No Mid-Attempt Feedback", () => {
  test("should not show correctness indicators after correct answer", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer first question (assume correct answer)
    await answerQuestion(page, 0);

    // Assert no correctness feedback is visible
    await assertNoCorrectnessFeedback(page);

    // Assert no success indicators
    await expect(page.locator("text=/correct/i")).not.toBeVisible();
    await expect(page.locator("text=/right/i")).not.toBeVisible();
    await expect(page.locator(".text-green-500, .bg-green-100")).not.toBeVisible();

    // Verify next question loads immediately
    await expect(page.locator("[data-testid='question-text']")).toBeVisible();
  });

  test("should not show correctness indicators after incorrect answer", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer first question (assume incorrect answer)
    await answerQuestion(page, 1);

    // Assert no correctness feedback is visible
    await assertNoCorrectnessFeedback(page);

    // Assert no error indicators
    await expect(page.locator("text=/incorrect/i")).not.toBeVisible();
    await expect(page.locator("text=/wrong/i")).not.toBeVisible();
    await expect(page.locator(".text-red-500, .bg-red-100")).not.toBeVisible();

    // Verify next question loads immediately
    await expect(page.locator("[data-testid='question-text']")).toBeVisible();
  });

  test("should show progress count only, never score", async ({ page }) => {
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Get initial progress
    const initialProgress = await getProgressInfo(page);
    const startQuestion = initialProgress.current;

    // Answer 3 questions (to avoid completing the attempt)
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4); // Cycle through options

      // Assert progress format (X/60) - account for existing progress
      const progress = await getProgressInfo(page);
      expect(progress.current).toBe(startQuestion + i + 1);
      expect(progress.total).toBe(60);

      // Assert no score or percentage displayed
      await toHaveNoScoreDisplay(page);
    }
  });

  test("should not display accuracy metrics during attempt", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer 10 questions
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);

      // Assert no accuracy metrics visible (allow progress percentage but not score percentage)
      await expect(page.locator("text=/\\d+\\s+correct/")).not.toBeVisible();
      await expect(page.locator("text=/accuracy/i")).not.toBeVisible();
      await expect(page.locator("text=/score/i")).not.toBeVisible();
    }
  });

  test("should exclude correctness fields from API response", async ({ page }) => {
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Intercept answer submission API call
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/evaluate/attempts/${attemptId}/answer`) && response.request().method() === "POST"
    );

    // Answer a question
    await answerQuestion(page, 0);

    // Wait for API response
    const response = await responsePromise;
    const responseData = await response.json();

    // Assert response contains only allowed fields
    await toHaveValidApiResponse(responseData, ["recorded", "progress"]);

    // Assert forbidden fields are not present
    expect(responseData).not.toHaveProperty("is_correct");
    expect(responseData).not.toHaveProperty("correct_index");
    expect(responseData).not.toHaveProperty("explanation");
    expect(responseData).not.toHaveProperty("score");
    expect(responseData).not.toHaveProperty("percentage");
  });

  test("should not expose correctness data in DOM", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer a question
    await answerQuestion(page, 0);

    // Check DOM for hidden correctness data
    await expect(page.locator("[data-correct]")).not.toBeVisible();
    await expect(page.locator("[data-iscorrect]")).not.toBeVisible();
    await expect(page.locator("[data-score]")).not.toBeVisible();

    // Check for hidden elements with correctness info
    await expect(page.locator(".hidden [data-correctness]")).not.toBeVisible();
    await expect(page.locator("[style*='display: none'] [data-correctness]")).not.toBeVisible();
  });

  test("should maintain progress format throughout attempt", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer multiple questions and verify progress format
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress format is always X/60
      await assertProgressFormat(page, i + 1);

      // Assert no percentage or score in progress
      const progressText = await page.locator("text=/\\d+\\/\\d+/").textContent();
      expect(progressText).toMatch(/^\d+\/60$/);
    }
  });

  test("should not show feedback even with slow network", async ({ page }) => {
    // Simulate slow network
    await page.route("**/api/evaluate/attempts/*/answer", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      await route.continue();
    });

    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Answer question with slow network
    await answerQuestion(page, 0);

    // Assert no feedback shown even with delay
    await assertNoCorrectnessFeedback(page);

    // Assert next question loads after delay
    await expect(page.locator("[data-testid='question-text']").or(page.locator("h2, h3").first())).toBeVisible();
  });

  test("should not show feedback on API errors", async ({ page }) => {
    // Start new attempt
    // Navigate to evaluate page and start/resume attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Look for either resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });

    if (await resumeButton.isVisible()) {
      await resumeButton.click();
    } else {
      await startButton.click();
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    const attemptId = page.url().match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];

    // Mock API error
    await page.route("**/api/evaluate/attempts/*/answer", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    // Try to answer question
    await answerQuestion(page, 0);

    // Assert no feedback shown on error
    await assertNoCorrectnessFeedback(page);

    // Assert error handling (retry button or error message)
    await expect(page.locator("text=/error/i").or(page.locator("text=/retry/i"))).toBeVisible();
  });
});
