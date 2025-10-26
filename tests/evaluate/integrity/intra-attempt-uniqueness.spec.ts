/**
 * Integrity Test: Intra-Attempt Uniqueness
 *
 * Validates that all 60 questions in a single attempt are unique.
 * This is a critical P0 constraint that must never be violated.
 */

import { test, expect } from "@playwright/test";
import {
  startNewAttempt,
  answerQuestion,
  answerMultipleQuestions,
  getCurrentQuestionId,
  getAttemptQuestionIds,
  pauseAttempt,
  resumeAttempt,
} from "../utils/testHelpers.utils";
import { toHaveUniqueQuestionIds, toHaveUniqueContent, toHaveNoDuplicates } from "../utils/customMatchers.utils";
import { EVALUATE_PAGE_LABELS, QUESTION_CARD_LABELS } from "@/constants/evaluate.constants";

test.describe("Intra-Attempt Uniqueness", () => {
  test("should have unique question IDs for all 60 questions", async ({ page }) => {
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

    const questionIds: string[] = [];

    // Answer 60 questions and collect IDs
    for (let i = 0; i < 60; i++) {
      // Get current question ID
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        questionIds.push(questionId);
      }

      // Answer the question
      await answerQuestion(page, i % 4);

      // Wait for next question (if not the last one)
      if (i < 59) {
        await page.waitForLoadState("networkidle");
      }
    }

    // Assert all question IDs are unique
    await toHaveUniqueQuestionIds(questionIds);
    expect(questionIds.length).toBe(60);
  });

  test("should not repeat questions when resuming attempt", async ({ page }) => {
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

    const firstBatchIds: string[] = [];

    // Answer 20 questions and collect IDs
    for (let i = 0; i < 20; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        firstBatchIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Pause attempt
    await pauseAttempt(page);

    // Resume attempt
    await resumeAttempt(page, attemptId);

    const secondBatchIds: string[] = [];

    // Answer next 20 questions and collect IDs
    for (let i = 0; i < 20; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        secondBatchIds.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Assert no overlap between first and second batch
    const allIds = [...firstBatchIds, ...secondBatchIds];
    await toHaveUniqueQuestionIds(allIds);

    // Assert no questions from first batch appear in second batch
    for (const id of firstBatchIds) {
      expect(secondBatchIds).not.toContain(id);
    }
  });

  test("should have unique question content (no near-duplicates)", async ({ page }) => {
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

    const questionTexts: string[] = [];

    // Answer 60 questions and collect question texts
    for (let i = 0; i < 60; i++) {
      // Get question text
      const questionText = await page
        .locator("[data-testid='question-text']")
        .or(page.locator("h2, h3").first())
        .textContent();

      if (questionText) {
        questionTexts.push(questionText);
      }

      await answerQuestion(page, i % 4);

      if (i < 59) {
        await page.waitForLoadState("networkidle");
      }
    }

    // Assert content uniqueness (no >70% similarity)
    await toHaveUniqueContent(
      questionTexts.map((text, index) => ({
        question: text,
        id: `q-${index}`,
      }))
    );
  });

  test("should handle duplicate question rejection gracefully", async ({ page }) => {
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

    // Mock API to return duplicate question ID on 31st fetch
    let questionCount = 0;
    const seenQuestionIds = new Set<string>();

    await page.route("**/api/evaluate/attempts/*", async (route) => {
      if (route.request().method() === "GET") {
        questionCount++;

        if (questionCount === 31) {
          // Return a duplicate question ID
          const duplicateId = seenQuestionIds.values().next().value;

          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              attempt: {
                id: attemptId,
                status: "in_progress",
                questions_answered: 30,
                correct_count: 0,
                total_questions: 60,
              },
              next_question: {
                id: duplicateId,
                question: "Duplicate question",
                options: ["A", "B", "C", "D"],
                code: null,
                metadata: {
                  topic: "React",
                  subtopic: "Fundamentals",
                  difficulty: "Easy",
                  bloom_level: "Remember",
                  question_order: 31,
                  coding_mode: false,
                },
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    // Answer 30 questions to reach the duplicate scenario
    for (let i = 0; i < 30; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        seenQuestionIds.add(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Try to answer the 31st question (should be duplicate)
    await answerQuestion(page, 0);

    // Assert duplicate is handled gracefully
    // Either: retry automatically, or show error with retry option
    await expect(page.locator("text=/retry/i").or(page.locator("text=/error/i"))).toBeVisible();
  });

  test("should maintain uniqueness across multiple sessions", async ({ page }) => {
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

    const session1Ids: string[] = [];

    // Answer 15 questions in first session
    for (let i = 0; i < 15; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        session1Ids.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Pause attempt
    await pauseAttempt(page);

    // Simulate browser close/reopen
    await page.close();
    await page.context().newPage();

    // Resume attempt
    await resumeAttempt(page, attemptId);

    const session2Ids: string[] = [];

    // Answer next 15 questions in second session
    for (let i = 0; i < 15; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        session2Ids.push(questionId);
      }
      await answerQuestion(page, i % 4);
    }

    // Assert no overlap between sessions
    const allSessionIds = [...session1Ids, ...session2Ids];
    await toHaveUniqueQuestionIds(allSessionIds);

    // Assert no questions from session 1 appear in session 2
    for (const id of session1Ids) {
      expect(session2Ids).not.toContain(id);
    }
  });

  test("should validate content key uniqueness", async ({ page }) => {
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

    // Answer all 60 questions
    for (let i = 0; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    // Navigate to results page
    await page.goto(`/evaluate/${attemptId}/results`);
    await page.waitForLoadState("networkidle");

    // Get all question data from results
    const questionElements = await page.locator("[data-testid='question-item']").all();
    const contentKeys: string[] = [];

    for (const element of questionElements) {
      const contentKey = await element.getAttribute("data-content-key");
      if (contentKey) {
        contentKeys.push(contentKey);
      }
    }

    // Assert content keys are unique
    if (contentKeys.length > 0) {
      await toHaveUniqueQuestionIds(contentKeys);
    }
  });

  test("should handle rapid question submission without duplicates", async ({ page }) => {
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

    const questionIds: string[] = [];

    // Answer questions rapidly
    for (let i = 0; i < 10; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        questionIds.push(questionId);
      }

      // Submit answer immediately without waiting
      await answerQuestion(page, i % 4);

      // Minimal wait for next question
      await page.waitForTimeout(100);
    }

    // Assert no duplicates despite rapid submission
    await toHaveUniqueQuestionIds(questionIds);
  });

  test("should maintain uniqueness with network interruptions", async ({ page }) => {
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

    const questionIds: string[] = [];

    // Simulate network interruptions
    await page.route("**/api/evaluate/attempts/*/answer", async (route) => {
      // Randomly delay some requests
      if (Math.random() < 0.3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      await route.continue();
    });

    // Answer 20 questions with network interruptions
    for (let i = 0; i < 20; i++) {
      const questionId = await getCurrentQuestionId(page);
      if (questionId) {
        questionIds.push(questionId);
      }

      await answerQuestion(page, i % 4);

      // Wait for network to stabilize
      await page.waitForLoadState("networkidle");
    }

    // Assert no duplicates despite network issues
    await toHaveUniqueQuestionIds(questionIds);
  });
});
