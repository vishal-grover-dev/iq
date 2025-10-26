/**
 * Integrity Test: Progress Visibility
 *
 * Validates that progress is displayed correctly throughout the attempt.
 * Ensures no score information is shown during the evaluation.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  getProgressInfo,
  assertProgressFormat,
  pauseAttempt,
  resumeAttempt,
  assertProgressAccessibility,
} from "../utils/testHelpers.utils";
import {
  toHaveCorrectProgressFormat,
  toHaveNoScoreDisplay,
  toHaveAccessibleProgress,
} from "../utils/customMatchers.utils";
import { EVALUATE_PAGE_LABELS, QUESTION_CARD_LABELS } from "@/constants/evaluate.constants";

test.describe("Progress Visibility", () => {
  test("should update progress bar after each submission", async ({ page }) => {
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

    // Answer 5 questions and verify progress updates
    for (let i = 0; i < 5; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress shows correct format (X/60)
      await assertProgressFormat(page, i + 1);

      // Assert progress text is visible
      const progressText = await page.locator("text=/\\d+\\/\\d+/").textContent();
      expect(progressText).toMatch(/^\d+\/60$/);
    }
  });

  test("should show progress counter throughout attempt", async ({ page }) => {
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

    // Answer 10 questions and verify progress is always visible
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress text is visible on each question
      await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();

      // Assert progress has correct format
      await toHaveCorrectProgressFormat((await page.locator("text=/\\d+\\/\\d+/").textContent()) || "");
    }
  });

  test("should never show score during attempt", async ({ page }) => {
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

    // Answer 30 questions (mix of correct/incorrect)
    for (let i = 0; i < 30; i++) {
      await answerQuestion(page, i % 4);

      // Assert no score information is displayed
      await toHaveNoScoreDisplay(page);

      // Assert no percentage displayed
      await expect(page.locator("text=/\\d+%/")).not.toBeVisible();

      // Assert no "X correct" text
      await expect(page.locator("text=/\\d+\\s+correct/")).not.toBeVisible();
    }
  });

  test("should persist progress across pause/resume", async ({ page }) => {
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

    // Answer 15 questions
    for (let i = 0; i < 15; i++) {
      await answerQuestion(page, i % 4);
    }

    // Verify progress shows 15/60
    await assertProgressFormat(page, 15);

    // Pause attempt
    await pauseAttempt(page);

    // Navigate away and back to landing page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Resume attempt
    await resumeAttempt(page, attemptId);

    // Assert progress still shows 15/60
    await assertProgressFormat(page, 15);

    // Answer next question
    await answerQuestion(page, 0);

    // Assert progress updates to 16/60
    await assertProgressFormat(page, 16);
  });

  test("should have proper accessibility attributes", async ({ page }) => {
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

    // Answer a few questions
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress bar has proper accessibility
      await assertProgressAccessibility(page);

      // Assert ARIA attributes are correct
      const progressBar = page.locator("[role='progressbar']");
      await expect(progressBar).toHaveAttribute("aria-valuenow", (i + 1).toString());
      await expect(progressBar).toHaveAttribute("aria-valuemin", "0");
      await expect(progressBar).toHaveAttribute("aria-valuemax", "60");
    }
  });

  test("should show smooth progress animation", async ({ page }) => {
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

    // Answer questions and verify smooth transitions
    for (let i = 0; i < 5; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress bar has smooth animation
      const progressBar = page.locator("[role='progressbar']");
      await expect(progressBar).toBeVisible();

      // Check for CSS transition properties
      const progressBarStyle = await progressBar.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          transition: computed.transition,
          transform: computed.transform,
        };
      });

      // Assert smooth transitions are applied
      expect(progressBarStyle.transition).toContain("width");
    }
  });

  test("should handle progress updates with slow network", async ({ page }) => {
    // Simulate slow network
    await page.route("**/api/evaluate/attempts/*/answer", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

    // Answer questions with slow network
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);

      // Assert progress updates despite slow network
      await assertProgressFormat(page, i + 1);
    }
  });

  test("should maintain progress format on page refresh", async ({ page }) => {
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

    // Answer 5 questions
    for (let i = 0; i < 5; i++) {
      await answerQuestion(page, i % 4);
    }

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert progress is still visible and correct
    await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();
    await assertProgressFormat(page, 5);
  });

  test("should show progress in different screen sizes", async ({ page }) => {
    // Test desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

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
    await answerQuestion(page, 0);

    // Assert progress is visible on desktop
    await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();

    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert progress is visible on mobile
    await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();

    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Assert progress is visible on tablet
    await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();
  });

  test("should handle progress updates with multiple rapid submissions", async ({ page }) => {
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

    // Submit answers rapidly
    for (let i = 0; i < 5; i++) {
      // Select option and submit immediately
      await page
        .locator(`[data-testid="option-${i % 4}"]`)
        .or(page.locator(`button:has-text("${(i % 4) + 1}")`))
        .click();

      await page.getByRole("button", { name: /submit.*answer/i }).click();

      // Minimal wait for next question
      await page.waitForTimeout(100);
    }

    // Assert progress is correct despite rapid submissions
    await assertProgressFormat(page, 5);
  });

  test("should show progress with keyboard navigation", async ({ page }) => {
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

    // Navigate with keyboard
    await page.keyboard.press("Tab"); // Focus first option
    await page.keyboard.press("Enter"); // Select option
    await page.keyboard.press("Tab"); // Focus submit button
    await page.keyboard.press("Enter"); // Submit

    // Assert progress updates
    await assertProgressFormat(page, 1);

    // Continue with keyboard navigation
    for (let i = 1; i < 3; i++) {
      await page.keyboard.press("Tab"); // Focus next option
      await page.keyboard.press("Enter"); // Select option
      await page.keyboard.press("Tab"); // Focus submit button
      await page.keyboard.press("Enter"); // Submit

      await assertProgressFormat(page, i + 1);
    }
  });

  test("should maintain progress visibility during loading states", async ({ page }) => {
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

    // Answer question and check progress during loading
    await answerQuestion(page, 0);

    // Assert progress is visible even during loading
    await expect(page.locator("text=/\\d+\\/\\d+/")).toBeVisible();

    // Assert progress format is maintained
    await toHaveCorrectProgressFormat((await page.locator("text=/\\d+\\/\\d+/").textContent()) || "");
  });
});
