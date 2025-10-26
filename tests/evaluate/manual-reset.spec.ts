/**
 * Manual reset script to clear all attempts
 */

import { test, expect } from "@playwright/test";

test.describe("Manual Reset", () => {
  test("should reset all attempts manually", async ({ page }) => {
    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for reset button
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });

    if (await resetButton.isVisible()) {
      console.log("Reset button found, clicking...");
      await resetButton.click();

      // Handle confirmation dialog
      page.on("dialog", async (dialog) => {
        console.log("Dialog appeared:", dialog.message());
        await dialog.accept();
      });

      // Wait for reset to complete
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      console.log("Reset completed");

      // Verify reset worked - should not show any resume buttons
      const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
      const isResumeVisible = await resumeButton.isVisible();
      console.log(`Resume button visible after reset: ${isResumeVisible}`);

      // Should show start button instead
      const startButton = page.getByRole("button", { name: /start.*evaluation/i });
      const isStartVisible = await startButton.isVisible();
      console.log(`Start button visible after reset: ${isStartVisible}`);
    } else {
      console.log("Reset button not found - may not be in dev mode");
    }
  });
});
