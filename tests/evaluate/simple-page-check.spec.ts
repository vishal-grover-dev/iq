/**
 * Simple test to check what's actually on the evaluate page
 */

import { test, expect } from "@playwright/test";

test.describe("Simple Page Check", () => {
  test("should check what's on the evaluate page", async ({ page }) => {
    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: "simple-evaluate-page.png" });

    // Check what buttons are available
    const buttons = await page.locator("button").all();
    console.log("Available buttons:");
    for (const button of buttons) {
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`- "${text}" (visible: ${isVisible})`);
    }

    // Check for any error messages
    const errorMessages = await page.locator("text=/error/i").all();
    console.log("Error messages found:");
    for (const error of errorMessages) {
      const text = await error.textContent();
      console.log(`- ${text}`);
    }

    // Check page content
    const bodyText = await page.locator("body").textContent();
    console.log("Page body text (first 1000 chars):", bodyText?.substring(0, 1000));

    // Try to click resume button if available
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    if (await resumeButton.isVisible()) {
      console.log("Resume button found, clicking...");
      await resumeButton.click();

      // Wait for redirect
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(5000);

      // Take screenshot of attempt page
      await page.screenshot({ path: "simple-attempt-page.png" });

      // Check what's on the attempt page
      const attemptButtons = await page.locator("button").all();
      console.log("Buttons on attempt page:");
      for (const button of attemptButtons) {
        const text = await button.textContent();
        const isVisible = await button.isVisible();
        console.log(`- "${text}" (visible: ${isVisible})`);
      }

      // Check for question card
      const questionCard = page.locator("[data-testid='question-card']");
      const questionCardCount = await questionCard.count();
      console.log(`Question card elements found: ${questionCardCount}`);

      if (questionCardCount > 0) {
        const isVisible = await questionCard.isVisible();
        console.log(`Question card visible: ${isVisible}`);
      }

      // Check for any loading states
      const loadingElements = await page.locator("text=/loading/i").all();
      console.log("Loading elements found:");
      for (const loading of loadingElements) {
        const text = await loading.textContent();
        console.log(`- ${text}`);
      }

      // Check for "Preparing next question" text
      const preparingText = page.locator("text=/Preparing next question/i");
      const isPreparingVisible = await preparingText.isVisible();
      console.log(`"Preparing next question" visible: ${isPreparingVisible}`);

      // Check page content
      const attemptBodyText = await page.locator("body").textContent();
      console.log("Attempt page body text (first 1000 chars):", attemptBodyText?.substring(0, 1000));
    }
  });
});
