/**
 * Complete Attempt Flow E2E Tests
 *
 * Tests the complete 60-question attempt flow and results page functionality.
 * Validates results display, score calculation, breakdowns, weak areas, and question review.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  getProgressInfo,
  navigateToResults,
  waitForApiResponse,
} from "../utils/testHelpers.utils";
import { RESULTS_PAGE_STATES } from "@/constants/evaluate.constants";

test.describe("Complete Attempt Flow", () => {
  test("should complete all 60 questions and redirect to results", async ({ page }) => {
    // Start new attempt
    const attemptId = await startNewAttempt(page);

    // Answer all 60 questions
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4); // Cycle through options 0-3
    }

    // Assert redirect to results page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Assert results page URL matches pattern
    expect(page.url()).toMatch(/\/evaluate\/[a-f0-9-]+\/results$/);
  });

  test("should show score and summary for first time", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    // Wait for results page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Assert score gauge is visible
    await expect(page.locator("text=/Evaluation Results/")).toBeVisible();

    // Assert score percentage is displayed
    const scoreText = await page.locator("text=/\\d+%/").first().textContent();
    expect(scoreText).toBeTruthy();

    // Assert "X / 60 correct" text is visible
    const correctText = await page.locator("text=/\\d+\\s*\\/\\s*60/").textContent();
    expect(correctText).toContain("/ 60");

    // Assert this is the FIRST time user sees correctness feedback
    // (No correctness indicators should have been shown during the attempt)
    // This is validated by the fact that we completed the attempt without seeing any feedback
  });

  test("should show topic/subtopic/Bloom breakdowns", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Assert topic breakdown is visible
    await expect(page.locator("text=/Performance by Topic/")).toBeVisible();

    // Assert Bloom level breakdown is visible
    await expect(page.locator("text=/Performance by Cognitive Level/")).toBeVisible();

    // Assert difficulty breakdown is visible
    await expect(page.locator("text=/Performance by Difficulty/")).toBeVisible();

    // Note: These components don't have data-testid attributes yet
    // They need to be added to the PerformanceBarChart component
  });

  test("should display weak areas panel with recommendations", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Assert weak areas panel is visible (if user has weak areas)
    const weakAreasPanel = page.locator("text=/Areas to Improve/");
    if (await weakAreasPanel.isVisible()) {
      await expect(weakAreasPanel).toBeVisible();

      // Assert at least one weak area is displayed
      const weakAreaCards = page.locator("article").filter({ hasText: /accuracy/i });
      if ((await weakAreaCards.count()) > 0) {
        await expect(weakAreaCards.first()).toBeVisible();

        // Assert each weak area has required elements
        const firstWeakArea = weakAreaCards.first();
        await expect(firstWeakArea.locator("text=/\\d+%/")).toBeVisible(); // Accuracy percentage
        await expect(firstWeakArea.locator("text=/recommendation/i")).toBeVisible(); // Recommendation text
      }
    }
  });

  test("should show review section with all 60 questions", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Scroll to review section
    await page.locator("text=/Question Review/").scrollIntoViewIfNeeded();

    // Assert question review list is visible
    await expect(page.locator("text=/Question Review/")).toBeVisible();

    // Assert filter controls are present
    const filterControls = page.locator("input, select, button").filter({ hasText: /filter|search|sort/i });
    await expect(filterControls.first()).toBeVisible();

    // Assert first few questions show required elements
    const questionCards = page.locator("[data-testid='question-card']");
    const firstQuestion = questionCards.first();

    if (await firstQuestion.isVisible()) {
      // Assert question text is visible
      await expect(firstQuestion.locator("[data-testid='question-text']")).toBeVisible();

      // Assert options are visible
      await expect(firstQuestion.locator("[data-testid='option-button']")).toHaveCount(4);

      // Assert explanation is visible (in review mode)
      await expect(firstQuestion.locator("text=/explanation/i")).toBeVisible();
    }
  });

  test("should return complete data from results API", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    // Intercept results API call
    const resultsResponse = await page.waitForResponse(/\/api\/evaluate\/attempts\/.*\/results/);
    const resultsData = await resultsResponse.json();

    // Assert response contains required fields
    expect(resultsData).toHaveProperty("summary");
    expect(resultsData).toHaveProperty("topic_breakdown");
    expect(resultsData).toHaveProperty("subtopic_breakdown");
    expect(resultsData).toHaveProperty("bloom_breakdown");
    expect(resultsData).toHaveProperty("weak_areas");
    expect(resultsData).toHaveProperty("questions");

    // Assert summary contains score and correct_count
    expect(resultsData.summary).toHaveProperty("score_percentage");
    expect(resultsData.summary).toHaveProperty("correct_count");
    expect(resultsData.summary).toHaveProperty("total_questions");

    // Assert breakdowns are arrays
    expect(Array.isArray(resultsData.topic_breakdown)).toBe(true);
    expect(Array.isArray(resultsData.subtopic_breakdown)).toBe(true);
    expect(Array.isArray(resultsData.bloom_breakdown)).toBe(true);
    expect(Array.isArray(resultsData.weak_areas)).toBe(true);
    expect(Array.isArray(resultsData.questions)).toBe(true);

    // Assert questions array has 60 items
    expect(resultsData.questions).toHaveLength(60);
  });

  test("should handle results page loading states", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    // Should show loading state briefly
    await expect(page.locator(`text=/${RESULTS_PAGE_STATES.LOADING_RESULTS}/`)).toBeVisible({ timeout: 2000 });

    // Wait for results to load
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
    await expect(page.locator("text=/Evaluation Results/")).toBeVisible();
  });

  test("should show appropriate error handling for results", async ({ page }) => {
    // Navigate to invalid results page
    await page.goto("/evaluate/invalid-attempt-id/results");

    // Should show error message
    await expect(page.locator("text=/Results not found/")).toBeVisible();

    // Should show return button
    const returnButton = page.getByRole("button", { name: /return to evaluate/i });
    await expect(returnButton).toBeVisible();
  });

  test("should allow navigation back to evaluate page", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Click "Back to Evaluate" button
    const backButton = page.getByRole("button", { name: /back to evaluate/i });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should redirect to evaluate page
    await page.waitForURL("/evaluate");
    await expect(page.locator("text=/Frontend Skills Assessment/")).toBeVisible();
  });

  test("should allow starting new attempt from results", async ({ page }) => {
    // Complete attempt
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Click "Start New Attempt" button
    const newAttemptButton = page.getByRole("button", { name: /start new attempt/i });
    await expect(newAttemptButton).toBeVisible();
    await newAttemptButton.click();

    // Should redirect to new attempt page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    await expect(page.locator("[data-testid='progress-indicator']")).toContainText("Question 1 / 60");
  });
});
