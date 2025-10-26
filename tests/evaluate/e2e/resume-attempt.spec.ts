/**
 * Resume Attempt Flow E2E Tests
 *
 * Tests that users can pause and resume attempts without losing progress or seeing duplicate questions.
 * Validates progress continuity, question uniqueness, and metadata display.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  getProgressInfo,
  getCurrentQuestionId,
  pauseAndNavigateBack,
} from "../utils/testHelpers.utils";
import { EVALUATE_PAGE_LABELS } from "@/constants/evaluate.constants";

test.describe("Resume Attempt Flow", () => {
  test("should resume with correct progress and continue from last question", async ({ page }) => {
    // Start new attempt and answer 10 questions
    const attemptId = await startNewAttempt(page);

    const firstTenQuestionIds: string[] = [];

    // Answer 10 questions and collect IDs
    for (let i = 0; i < 10; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        firstTenQuestionIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Navigate back to landing page
    await pauseAndNavigateBack(page);

    // Click "Resume Evaluation" button
    const resumeButton = page.getByRole("button", { name: new RegExp(EVALUATE_PAGE_LABELS.RESUME_BUTTON, "i") });
    await expect(resumeButton).toBeVisible();
    await resumeButton.click();

    // Wait for redirect to attempt page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Assert progress shows "Question 11 / 60" (10 questions answered + 1 current)
    await expect(page.locator("[data-testid='progress-indicator']")).toContainText("Question 11 / 60");

    // Assert question 11 loads (should be different from first 10)
    const question11Id = await getCurrentQuestionId(page);
    expect(question11Id).toBeTruthy();
    expect(firstTenQuestionIds).not.toContain(question11Id);
  });

  test("should not repeat previously answered questions", async ({ page }) => {
    // Start new attempt and answer 10 questions
    const attemptId = await startNewAttempt(page);

    const firstTenQuestionIds: string[] = [];

    // Answer 10 questions and collect IDs
    for (let i = 0; i < 10; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        firstTenQuestionIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Navigate back and resume
    await pauseAndNavigateBack(page);
    const resumeButton = page.getByRole("button", { name: new RegExp(EVALUATE_PAGE_LABELS.RESUME_BUTTON, "i") });
    await resumeButton.click();
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Answer next 20 questions (questions 11-30)
    const nextTwentyQuestionIds: string[] = [];

    for (let i = 0; i < 20; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        nextTwentyQuestionIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Assert no overlap between first 10 IDs and next 20 IDs
    const firstTenSet = new Set(firstTenQuestionIds);
    const nextTwentySet = new Set(nextTwentyQuestionIds);
    const overlap = [...firstTenSet].filter((id) => nextTwentySet.has(id));

    expect(overlap.length).toBe(0);
    expect(nextTwentyQuestionIds.length).toBe(20);
  });

  test("should maintain integrity across multiple pause/resume cycles", async ({ page }) => {
    // Start attempt, answer 10 questions, pause
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);
    }

    await pauseAndNavigateBack(page);
    const resumeButton1 = page.getByRole("button", { name: /resume.*evaluation/i });
    await resumeButton1.click();
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Resume, answer 10 more questions, pause
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);
    }

    await pauseAndNavigateBack(page);
    const resumeButton2 = page.getByRole("button", { name: /resume.*evaluation/i });
    await resumeButton2.click();
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Resume, answer 10 more questions, pause
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);
    }

    await pauseAndNavigateBack(page);
    const resumeButton3 = page.getByRole("button", { name: /resume.*evaluation/i });
    await resumeButton3.click();
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Verify progress shows 30/60
    const progress = await getProgressInfo(page);
    expect(progress.current).toBe(30);
    expect(progress.total).toBe(60);

    // Answer remaining 30 questions
    for (let i = 0; i < 30; i++) {
      await answerQuestion(page, i % 4);
    }

    // Should redirect to results page
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
  });

  test("should show correct metadata in resume section", async ({ page }) => {
    // Start attempt and answer 15 questions
    const attemptId = await startNewAttempt(page);

    for (let i = 0; i < 15; i++) {
      await answerQuestion(page, i % 4);
    }

    // Navigate to landing page
    await pauseAndNavigateBack(page);

    // Assert "Resume Evaluation" section shows correct metadata
    const resumeSection = page.locator("div").filter({ hasText: /Resume Evaluation/ });
    await expect(resumeSection).toBeVisible();

    // Assert progress shows "15 / 60 questions"
    const progressText = await page.locator("text=/\\d+\\s*\\/\\s*60/").textContent();
    expect(progressText).toContain("15 / 60");

    // Assert progress bar shows 25% (15/60)
    const progressBar = page.locator("div").filter({ hasText: /25%/ });
    await expect(progressBar).toBeVisible();

    // Assert started date is displayed
    const startedDate = page.locator("text=/Started/");
    await expect(startedDate).toBeVisible();
  });

  test("should handle resume with no in-progress attempt", async ({ page }) => {
    // Navigate to evaluate page with no in-progress attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Should not show resume section
    const resumeSection = page.locator("div").filter({ hasText: /Resume Evaluation/ });
    await expect(resumeSection).not.toBeVisible();

    // Should show start new evaluation section
    const startSection = page.locator("div").filter({ hasText: /Start New Evaluation/ });
    await expect(startSection).toBeVisible();
  });

  test("should maintain question order across pause/resume", async ({ page }) => {
    // Start attempt and answer 5 questions
    const attemptId = await startNewAttempt(page);

    const firstFiveIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        firstFiveIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Pause and resume
    await pauseAndNavigateBack(page);
    const resumeButton = page.getByRole("button", { name: new RegExp(EVALUATE_PAGE_LABELS.RESUME_BUTTON, "i") });
    await resumeButton.click();
    await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

    // Answer 5 more questions
    const nextFiveIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        nextFiveIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // All 10 question IDs should be unique
    const allIds = [...firstFiveIds, ...nextFiveIds];
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  test("should handle rapid pause/resume cycles", async ({ page }) => {
    // Start attempt
    const attemptId = await startNewAttempt(page);

    // Answer 1 question
    await answerQuestion(page, 0);

    // Rapid pause/resume cycle
    for (let i = 0; i < 3; i++) {
      await pauseAndNavigateBack(page);
      const resumeButton = page.getByRole("button", { name: new RegExp(EVALUATE_PAGE_LABELS.RESUME_BUTTON, "i") });
      await resumeButton.click();
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);
    }

    // Should still be on question 2 (1 answered + 1 current)
    await expect(page.locator("[data-testid='progress-indicator']")).toContainText("Question 2 / 60");
  });
});
