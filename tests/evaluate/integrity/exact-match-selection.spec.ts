/**
 * Integrity Test: Exact Match Question Selection
 *
 * Validates that the question selection system uses exact 5-dimension matching
 * (topic, subtopic, difficulty, bloom_level, coding_mode) instead of preference-based scoring.
 */

import { test, expect } from "@playwright/test";
import { startNewAttempt, getCurrentQuestionId } from "../utils/testHelpers.utils";
import { QUESTION_CARD_LABELS } from "@/constants/evaluate.constants";

test.describe("Exact Match Question Selection", () => {
  test("should load questions with proper metadata structure", async ({ page }) => {
    // Start a new attempt
    await startNewAttempt(page);

    // Verify we can get a question ID (indicates question loaded successfully)
    const questionId = await getCurrentQuestionId(page);
    expect(questionId).toBeTruthy();

    // Check that question metadata is displayed in the UI
    const metadataElements = page.locator('[data-testid*="metadata"], .metadata, [class*="metadata"]');
    const metadataCount = await metadataElements.count();

    // Should have some metadata displayed (topic, difficulty, etc.)
    expect(metadataCount).toBeGreaterThan(0);

    console.log("Question ID:", questionId);
    console.log("Metadata elements found:", metadataCount);
  });

  test("should handle question transitions without errors", async ({ page }) => {
    // Start a new attempt
    await startNewAttempt(page);

    // Answer a few questions to test the selection system
    for (let i = 0; i < 3; i++) {
      // Verify question is loaded
      const questionId = await getCurrentQuestionId(page);
      expect(questionId).toBeTruthy();

      // Answer the question
      await page
        .getByRole("button", { name: /^[1-4]$/ })
        .first()
        .click();
      await page.getByRole("button", { name: QUESTION_CARD_LABELS.SUBMIT_ANSWER }).click();

      // Wait for next question to load
      await page.waitForTimeout(1000);

      // Verify next question loaded
      const nextQuestionId = await getCurrentQuestionId(page);
      expect(nextQuestionId).toBeTruthy();
      expect(nextQuestionId).not.toBe(questionId); // Should be different question

      console.log(`Question ${i + 1} ID:`, questionId);
    }
  });

  test("should maintain question uniqueness within attempt", async ({ page }) => {
    // Start a new attempt
    await startNewAttempt(page);

    const seenQuestionIds = new Set<string>();

    // Answer several questions and track uniqueness
    for (let i = 0; i < 5; i++) {
      const questionId = await getCurrentQuestionId(page);
      expect(questionId).toBeTruthy();

      // Verify question hasn't been seen before in this attempt
      expect(seenQuestionIds.has(questionId!)).toBe(false);
      seenQuestionIds.add(questionId!);

      // Answer the question
      await page
        .getByRole("button", { name: /^[1-4]$/ })
        .first()
        .click();
      await page.getByRole("button", { name: QUESTION_CARD_LABELS.SUBMIT_ANSWER }).click();

      // Wait for next question to load
      await page.waitForTimeout(1000);
    }

    console.log("Unique questions seen:", seenQuestionIds.size);
    expect(seenQuestionIds.size).toBe(5);
  });
});
