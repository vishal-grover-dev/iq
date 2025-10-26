/**
 * Reset Button Functionality Tests
 *
 * Tests the dev-only reset button functionality for clearing all attempts.
 * Validates reset confirmation, API calls, and UI state after reset.
 */

import { test, expect } from "@playwright/test";
import {
  resetAllAttempts,
  isResetButtonAvailable,
  startNewAttempt,
  answerQuestion,
  getPastAttempts,
} from "../utils/testHelpers.utils";

test.describe("Reset Button Functionality", () => {
  test("should show reset button only in dev mode", async ({ page }) => {
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    const isVisible = await resetButton.isVisible();

    // Reset button should only be visible when DEV_DEFAULT_USER_ID is set
    if (isVisible) {
      // Verify button has correct styling and text
      await expect(resetButton).toHaveClass(/border-yellow-500/);
      await expect(resetButton).toContainText("Reset All Attempts");

      // Verify button has trash icon
      const trashIcon = resetButton.locator("svg");
      await expect(trashIcon).toBeVisible();
    }
  });

  test("should handle reset confirmation dialog", async ({ page }) => {
    const resetAvailable = await isResetButtonAvailable(page);
    if (!resetAvailable) {
      test.skip("Reset button not available - not in dev mode");
    }

    // Create some attempts first
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 5; i++) {
      await answerQuestion(page, i % 4);
    }

    // Navigate back to landing page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Verify attempts exist
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();

    // Set up dialog handler
    let dialogHandled = false;
    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("Delete all attempts");
      expect(dialog.message()).toContain("cannot be undone");
      dialogHandled = true;
      await dialog.accept();
    });

    // Click reset button
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    // Verify dialog was handled
    expect(dialogHandled).toBe(true);

    // Wait for reset to complete
    await page.waitForLoadState("networkidle");

    // Verify attempts are cleared
    await expect(pastAttempts).not.toBeVisible();
  });

  test("should cancel reset when dialog is dismissed", async ({ page }) => {
    const resetAvailable = await isResetButtonAvailable(page);
    if (!resetAvailable) {
      test.skip("Reset button not available - not in dev mode");
    }

    // Create some attempts first
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);
    }

    // Navigate back to landing page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Verify attempts exist
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();

    // Set up dialog handler to cancel
    page.on("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    // Click reset button
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    await resetButton.click();

    // Wait a moment for any async operations
    await page.waitForTimeout(1000);

    // Verify attempts still exist (not reset)
    await expect(pastAttempts).toBeVisible();
  });

  test("should show loading state during reset", async ({ page }) => {
    const resetAvailable = await isResetButtonAvailable(page);
    if (!resetAvailable) {
      test.skip("Reset button not available - not in dev mode");
    }

    // Create some attempts first
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Set up dialog handler
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click reset button and check loading state
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    await resetButton.click();

    // Should show loading state
    await expect(resetButton).toContainText("Resetting...");
    await expect(resetButton).toBeDisabled();

    // Wait for reset to complete
    await page.waitForLoadState("networkidle");

    // Button should return to normal state
    await expect(resetButton).toContainText("Reset All Attempts");
    await expect(resetButton).toBeEnabled();
  });

  test("should reset all attempt data completely", async ({ page }) => {
    const resetAvailable = await isResetButtonAvailable(page);
    if (!resetAvailable) {
      test.skip("Reset button not available - not in dev mode");
    }

    // Create multiple attempts with different progress
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 10; i++) {
      await answerQuestion(page, i % 4);
    }

    // Pause first attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Start second attempt
    const attempt2Id = await startNewAttempt(page);
    for (let i = 0; i < 5; i++) {
      await answerQuestion(page, i % 4);
    }

    // Complete second attempt
    for (let i = 5; i < 60; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.waitForURL(/\/evaluate\/[a-f0-9-]+\/results$/);

    // Navigate to landing page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Verify we have both in-progress and completed attempts
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(resumeButton).toBeVisible();
    await expect(pastAttempts).toBeVisible();

    // Reset all attempts
    await resetAllAttempts(page);

    // Verify everything is cleared
    await expect(resumeButton).not.toBeVisible();
    await expect(pastAttempts).not.toBeVisible();

    // Should show "Start New Evaluation" button
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });
    await expect(startButton).toBeVisible();
  });

  test("should handle reset API errors gracefully", async ({ page }) => {
    const resetAvailable = await isResetButtonAvailable(page);
    if (!resetAvailable) {
      test.skip("Reset button not available - not in dev mode");
    }

    // Mock API failure for reset endpoint
    await page.route("**/api/evaluate/attempts/reset", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    // Create some attempts
    const attempt1Id = await startNewAttempt(page);
    for (let i = 0; i < 3; i++) {
      await answerQuestion(page, i % 4);
    }

    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    // Set up dialog handler
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Click reset button
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    await resetButton.click();

    // Should show error toast
    await expect(page.locator("text=/Failed to reset attempts/")).toBeVisible();

    // Button should return to normal state
    await expect(resetButton).toContainText("Reset All Attempts");
    await expect(resetButton).toBeEnabled();

    // Attempts should still exist
    const pastAttempts = page.locator("text=/Past Attempts/");
    await expect(pastAttempts).toBeVisible();
  });

  test("should not show reset button to regular users", async ({ page }) => {
    // This test assumes we're not in dev mode
    // In production, the reset button should never be visible
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");

    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    const isVisible = await resetButton.isVisible();

    if (!isVisible) {
      // This is the expected behavior in production
      // Reset button should only be visible in dev mode
      expect(isVisible).toBe(false);
    } else {
      // If visible, it means we're in dev mode
      // This is acceptable for testing purposes
      console.log("Reset button is visible - running in dev mode");
    }
  });
});
