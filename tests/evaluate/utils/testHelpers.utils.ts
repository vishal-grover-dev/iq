/**
 * Test helper utilities for evaluate page testing
 * Provides common actions and assertions for testing the evaluation flow
 */

import { Page, expect } from "@playwright/test";
import { EVALUATION_CONFIG } from "@/constants/evaluate.constants";

/**
 * Check if we're in dev mode (reset button available)
 */
export async function isResetButtonAvailable(page: Page): Promise<boolean> {
  const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
  return await resetButton.isVisible();
}

/**
 * Reset all attempts if in dev mode
 */
export async function resetAllAttempts(page: Page): Promise<void> {
  const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
  if (await resetButton.isVisible()) {
    console.log("Resetting all attempts...");
    await resetButton.click();

    // Handle confirmation dialog
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Wait for reset to complete
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    console.log("Reset complete");
  }
}

/**
 * Start a fresh attempt (always reset if in dev mode)
 */
export async function startFreshAttempt(page: Page): Promise<string> {
  await page.goto("/evaluate");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Always reset if in dev mode to ensure fresh start
  if (await isResetButtonAvailable(page)) {
    console.log("Dev mode detected - resetting all attempts for fresh start");
    await resetAllAttempts(page);
  }

  // Now start new attempt
  const startButton = page.getByRole("button", { name: /start.*evaluation/i });
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Wait for redirect to attempt page
  await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Extract attempt ID from URL
  const url = page.url();
  const attemptId = url.match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];
  if (!attemptId) {
    throw new Error("Failed to extract attempt ID from URL");
  }

  console.log(`Started fresh attempt: ${attemptId}`);
  return attemptId;
}

/**
 * Navigate to evaluate page and start a new attempt
 * Returns the attempt ID from the redirect
 */
export async function startNewAttempt(page: Page): Promise<string> {
  await page.goto("/evaluate");

  // Wait for page to load completely
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000); // Additional wait for any async operations

  // Check if there's an in-progress attempt first
  const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
  const startButton = page.getByRole("button", { name: /start.*evaluation/i });

  // If there's a resume button, we have an existing attempt
  if (await resumeButton.isVisible()) {
    console.log("Resume button found - existing attempt detected");

    // In dev mode, we can reset all attempts to start fresh
    if (await isResetButtonAvailable(page)) {
      console.log("Reset button available - resetting all attempts for fresh start");
      await resetAllAttempts(page);

      // After reset, we should see the start button
      await expect(startButton).toBeVisible({ timeout: 10000 });
    } else {
      // No reset button available, use existing attempt
      console.log("No reset button available - using existing attempt");
      await resumeButton.click();
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/);

      // Extract attempt ID from URL
      const url = page.url();
      const attemptId = url.match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];
      if (attemptId) {
        console.log(`Using existing attempt: ${attemptId}`);
        return attemptId;
      }
    }
  }

  // Now look for "Start New Evaluation" button
  await expect(startButton).toBeVisible({ timeout: 10000 });
  await startButton.click();

  // Wait for redirect to attempt page with longer timeout
  await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/, { timeout: 15000 });

  // Wait for the attempt page to fully load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  // Extract attempt ID from URL
  const url = page.url();
  const attemptId = url.match(/\/evaluate\/([a-f0-9-]+)$/)?.[1];
  if (!attemptId) {
    throw new Error("Failed to extract attempt ID from URL");
  }

  return attemptId;
}

/**
 * Navigate to an existing attempt
 */
export async function resumeAttempt(page: Page, attemptId: string): Promise<void> {
  await page.goto(`/evaluate/${attemptId}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Answer a question by selecting an option and submitting
 */
export async function answerQuestion(page: Page, optionIndex: number): Promise<void> {
  // Wait for question to be fully loaded
  await waitForQuestionLoad(page);

  // Select the option (0-3) - use the actual option button selector
  const optionButton = page.locator(`[data-testid="option-button"]`).nth(optionIndex);
  await expect(optionButton).toBeVisible({ timeout: 10000 });
  await expect(optionButton).toBeEnabled();
  await optionButton.click();

  // Submit the answer
  const submitButton = page.getByRole("button", { name: /submit.*answer/i });
  await expect(submitButton).toBeEnabled({ timeout: 10000 });
  await submitButton.click();

  // Wait for submission to complete with longer timeout
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000); // Additional wait for any animations or state updates
}

/**
 * Answer multiple questions in sequence
 */
export async function answerMultipleQuestions(page: Page, count: number, answers?: number[]): Promise<string[]> {
  const questionIds: string[] = [];

  for (let i = 0; i < count; i++) {
    // Get current question ID if available
    const questionId = await getCurrentQuestionId(page);
    if (questionId) {
      questionIds.push(questionId);
    }

    // Answer the question
    const answerIndex = answers?.[i] ?? Math.floor(Math.random() * 4);
    await answerQuestion(page, answerIndex);

    // Wait for next question to load (if not the last question)
    if (i < count - 1) {
      await waitForQuestionLoad(page);
    }
  }

  return questionIds;
}

/**
 * Navigate to results page
 */
export async function navigateToResults(page: Page, attemptId: string): Promise<void> {
  await page.goto(`/evaluate/${attemptId}/results`);
  await page.waitForLoadState("networkidle");
}

/**
 * Wait for question to be fully rendered
 */
export async function waitForQuestionLoad(page: Page): Promise<void> {
  // Wait for page to be fully loaded first
  await page.waitForLoadState("networkidle");

  // Wait for "Preparing next question..." loading state to disappear
  const loadingText = page.locator("text=/Preparing next question/i");
  if (await loadingText.isVisible()) {
    console.log("Waiting for question loading to complete...");
    try {
      await expect(loadingText).not.toBeVisible({ timeout: 60000 });
    } catch (error) {
      console.log("Loading text did not disappear within 60 seconds - may be stuck");
      // Continue anyway to see what's on the page
    }
  }

  // Wait for any additional loading states to complete
  await page.waitForTimeout(3000);

  // Check if we're on a completed attempt (61/60 questions)
  const progressText = await page
    .locator("text=/\\d+\\s*\\/\\s*60/")
    .textContent()
    .catch(() => null);
  if (progressText && progressText.includes("61")) {
    throw new Error("Attempt has already completed 61 questions (invalid state)");
  }

  // Wait for question card to be visible with longer timeout
  try {
    await expect(page.locator("[data-testid='question-card']")).toBeVisible({ timeout: 30000 });
  } catch (error) {
    console.log("Question card not found - checking page state");
    const bodyText = await page.locator("body").textContent();
    console.log("Page content:", bodyText?.substring(0, 500));
    throw error;
  }

  // Wait for question text to be visible (it's rendered through ReactMarkdown)
  await expect(page.locator("[data-testid='question-text']")).toBeVisible({ timeout: 15000 });

  // Wait for options to be visible - use the actual data-testid for option buttons
  await expect(page.locator("[data-testid='option-button']").first()).toBeVisible({ timeout: 15000 });

  // Wait for submit button to be visible (it may be disabled initially)
  const submitButton = page.getByRole("button", { name: /submit.*answer/i });
  await expect(submitButton).toBeVisible({ timeout: 15000 });
}

/**
 * Get current progress information
 */
export async function getProgressInfo(page: Page): Promise<{ current: number; total: number }> {
  // The actual UI shows "Question X / 60" format in the progress indicator
  const progressText = await page.locator("[data-testid='progress-indicator']").textContent();

  if (!progressText) {
    throw new Error("Could not find progress information");
  }

  // Parse "Question X / 60" format
  // Note: X is the current question number (1-based), not questions answered
  const match = progressText.match(/Question\s+(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`Invalid progress format: ${progressText}`);
  }

  const currentQuestion = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);

  // Convert to questions answered (0-based)
  const questionsAnswered = currentQuestion - 1;

  return {
    current: questionsAnswered,
    total: total,
  };
}

/**
 * Get current question ID from the page
 */
export async function getCurrentQuestionId(page: Page): Promise<string | null> {
  // Try to extract from data attribute on question card
  const questionId = await page.getAttribute("[data-testid='question-card']", "data-question-id");
  if (questionId) {
    return questionId;
  }

  // Try to extract from URL if it contains question ID
  const url = page.url();
  const urlMatch = url.match(/\/evaluate\/[^\/]+\/([^\/]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
}

/**
 * Pause the current attempt
 */
export async function pauseAttempt(page: Page): Promise<void> {
  const pauseButton = page.getByRole("button", { name: /pause.*save/i });
  await expect(pauseButton).toBeVisible();
  await pauseButton.click();

  // Wait for redirect to landing page
  await page.waitForURL("/evaluate");
}

/**
 * Wait for attempt to complete and redirect to results
 */
export async function waitForAttemptCompletion(page: Page): Promise<void> {
  await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);
  await page.waitForLoadState("networkidle");
}

/**
 * Get all question IDs from a completed attempt
 */
export async function getAttemptQuestionIds(page: Page, attemptId: string): Promise<string[]> {
  await navigateToResults(page, attemptId);

  // Wait for results to load
  await page.waitForSelector("[data-testid='question-review']");

  // Extract question IDs from the review section
  // This might need to be customized based on how the review section is structured
  const questionElements = await page.locator("[data-testid='question-item']").all();
  const questionIds: string[] = [];

  for (const element of questionElements) {
    const questionId = await element.getAttribute("data-question-id");
    if (questionId) {
      questionIds.push(questionId);
    }
  }

  return questionIds;
}

/**
 * Check if progress bar shows correct format (X/60)
 */
export async function assertProgressFormat(page: Page, expectedCurrent: number): Promise<void> {
  const progress = await getProgressInfo(page);
  expect(progress.current).toBe(expectedCurrent);
  expect(progress.total).toBe(EVALUATION_CONFIG.TOTAL_QUESTIONS);
}

/**
 * Check that no correctness feedback is visible
 */
export async function assertNoCorrectnessFeedback(page: Page): Promise<void> {
  // Check for common correctness indicators
  await expect(page.locator("text=/correct/i")).not.toBeVisible();
  await expect(page.locator("text=/incorrect/i")).not.toBeVisible();
  await expect(page.locator("text=/right/i")).not.toBeVisible();
  await expect(page.locator("text=/wrong/i")).not.toBeVisible();

  // Check for success/error styling
  await expect(page.locator(".text-green-500, .text-red-500, .bg-green-100, .bg-red-100")).not.toBeVisible();

  // Check for score/percentage display
  await expect(page.locator("text=/\\d+%/")).not.toBeVisible();
  await expect(page.locator("text=/\\d+\\s+correct/")).not.toBeVisible();
}

/**
 * Check that progress bar has proper accessibility attributes
 */
export async function assertProgressAccessibility(page: Page): Promise<void> {
  const progressBar = page.locator("[role='progressbar']");
  await expect(progressBar).toBeVisible();

  // Check ARIA attributes
  await expect(progressBar).toHaveAttribute("aria-valuenow");
  await expect(progressBar).toHaveAttribute("aria-valuemin", "0");
  await expect(progressBar).toHaveAttribute("aria-valuemax", EVALUATION_CONFIG.TOTAL_QUESTIONS.toString());
}

/**
 * Wait for API response and return the response data
 */
export async function waitForApiResponse<T>(
  page: Page,
  urlPattern: RegExp,
  method: "GET" | "POST" | "PATCH" = "GET"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for API response to ${urlPattern}`));
    }, 10000);

    page.on("response", async (response) => {
      if (response.url().match(urlPattern) && response.request().method() === method) {
        clearTimeout(timeout);
        try {
          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error}`));
        }
      }
    });
  });
}

/**
 * Pause attempt and navigate back to landing page
 */
export async function pauseAndNavigateBack(page: Page): Promise<void> {
  await page.goto("/evaluate");
  await page.waitForLoadState("networkidle");
}

/**
 * Get metadata from resume button section
 */
export async function getResumeButtonMetadata(page: Page): Promise<{
  questionsAnswered: number;
  totalQuestions: number;
  startedDate: string;
}> {
  const progressText = await page.locator("text=/\\d+\\s*\\/\\s*60/").textContent();
  const dateText = await page.locator("text=/Started/").textContent();

  // Parse "15 / 60 questions"
  const match = progressText?.match(/(\d+)\s*\/\s*(\d+)/);

  return {
    questionsAnswered: match ? parseInt(match[1]) : 0,
    totalQuestions: match ? parseInt(match[2]) : 60,
    startedDate: dateText || "",
  };
}

/**
 * Get score from results page
 */
export async function getResultsScore(page: Page): Promise<{
  percentage: number;
  correct: number;
  total: number;
}> {
  const scoreText = await page.locator("text=/\\d+%/").first().textContent();
  const percentMatch = scoreText?.match(/(\d+)%/);
  const countText = await page.locator("text=/\\d+\\s*\\/\\s*60/").textContent();
  const countMatch = countText?.match(/(\d+)\s*\/\s*(\d+)/);

  return {
    percentage: percentMatch ? parseInt(percentMatch[1]) : 0,
    correct: countMatch ? parseInt(countMatch[1]) : 0,
    total: countMatch ? parseInt(countMatch[2]) : 60,
  };
}

/**
 * Get past attempts from landing page
 */
export async function getPastAttempts(page: Page): Promise<
  Array<{
    score: number;
    completedDate: string;
  }>
> {
  const attempts = page.locator("div").filter({ hasText: /Completed/ });
  const count = await attempts.count();

  const results = [];
  for (let i = 0; i < count; i++) {
    const attempt = attempts.nth(i);
    const scoreText = await attempt.locator("text=/\\d+%/").textContent();
    const dateText = await attempt.locator("text=/Completed/").textContent();

    results.push({
      score: parseInt(scoreText?.match(/(\d+)%/)?.[1] || "0"),
      completedDate: dateText || "",
    });
  }

  return results;
}

/**
 * Compare two question ID sets and return overlap percentage
 */
export function compareQuestionSets(
  ids1: string[],
  ids2: string[]
): {
  overlap: number;
  overlapPercentage: number;
  unique1: number;
  unique2: number;
} {
  const set1 = new Set(ids1);
  const set2 = new Set(ids2);

  const overlap = ids1.filter((id) => set2.has(id)).length;
  const overlapPercentage = (overlap / Math.max(ids1.length, ids2.length)) * 100;

  return {
    overlap,
    overlapPercentage,
    unique1: ids1.length - overlap,
    unique2: ids2.length - overlap,
  };
}
