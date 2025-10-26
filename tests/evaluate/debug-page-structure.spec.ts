/**
 * Debug test to understand page structure and API issues
 */

import { test, expect } from "@playwright/test";

test.describe("Debug Page Structure", () => {
  test("should debug what's on the evaluate page", async ({ page }) => {
    // Navigate to evaluate page
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Take a screenshot
    await page.screenshot({ path: "debug-evaluate-page.png" });

    // Log all elements with data-testid
    const elementsWithTestId = await page.locator("[data-testid]").all();
    console.log("Elements with data-testid:");
    for (const element of elementsWithTestId) {
      const testId = await element.getAttribute("data-testid");
      const tagName = await element.evaluate(el => el.tagName);
      const isVisible = await element.isVisible();
      console.log(`- ${tagName}[data-testid="${testId}"] (visible: ${isVisible})`);
    }

    // Check for any error messages
    const errorMessages = await page.locator("text=/error/i").all();
    console.log("Error messages found:");
    for (const error of errorMessages) {
      const text = await error.textContent();
      console.log(`- ${text}`);
    }

    // Check for loading states
    const loadingElements = await page.locator("text=/loading/i").all();
    console.log("Loading elements found:");
    for (const loading of loadingElements) {
      const text = await loading.textContent();
      console.log(`- ${text}`);
    }

    // Check page title and URL
    console.log(`Page title: ${await page.title()}`);
    console.log(`Current URL: ${page.url()}`);

    // Check if there are any buttons
    const buttons = await page.locator("button").all();
    console.log("Buttons found:");
    for (const button of buttons) {
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      console.log(`- "${text}" (visible: ${isVisible})`);
    }
  });

  test("should debug attempt page structure", async ({ page }) => {
    // First try to start an attempt
    await page.goto("/evaluate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Try to reset attempts first if available
    const resetButton = page.getByRole("button", { name: /reset.*all.*attempts/i });
    if (await resetButton.isVisible()) {
      console.log("Reset button found, clicking...");
      await resetButton.click();
      
      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });
      
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    // Look for resume or start button
    const resumeButton = page.getByRole("button", { name: /resume.*evaluation/i });
    const startButton = page.getByRole("button", { name: /start.*evaluation/i });
    
    if (await resumeButton.isVisible()) {
      console.log("Resume button found, clicking...");
      await resumeButton.click();
      
      // Wait for redirect
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Take screenshot of attempt page
      await page.screenshot({ path: "debug-attempt-page.png" });

      // Log all elements with data-testid
      const elementsWithTestId = await page.locator("[data-testid]").all();
      console.log("Elements with data-testid on attempt page:");
      for (const element of elementsWithTestId) {
        const testId = await element.getAttribute("data-testid");
        const tagName = await element.evaluate(el => el.tagName);
        const isVisible = await element.isVisible();
        console.log(`- ${tagName}[data-testid="${testId}"] (visible: ${isVisible})`);
      }

      // Check for question card specifically
      const questionCard = page.locator("[data-testid='question-card']");
      const questionCardExists = await questionCard.count();
      console.log(`Question card elements found: ${questionCardExists}`);
      
      if (questionCardExists > 0) {
        const isVisible = await questionCard.isVisible();
        console.log(`Question card visible: ${isVisible}`);
      }

      // Check for any error messages
      const errorMessages = await page.locator("text=/error/i").all();
      console.log("Error messages on attempt page:");
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log(`- ${text}`);
      }

      // Check page content
      const bodyText = await page.locator("body").textContent();
      console.log("Page body text (first 500 chars):", bodyText?.substring(0, 500));
    } else if (await startButton.isVisible()) {
      console.log("Start button found, clicking...");
      await startButton.click();
      
      // Wait for redirect
      await page.waitForURL(/\/evaluate\/[a-f0-9-]+$/, { timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Take screenshot of attempt page
      await page.screenshot({ path: "debug-attempt-page.png" });

      // Log all elements with data-testid
      const elementsWithTestId = await page.locator("[data-testid]").all();
      console.log("Elements with data-testid on attempt page:");
      for (const element of elementsWithTestId) {
        const testId = await element.getAttribute("data-testid");
        const tagName = await element.evaluate(el => el.tagName);
        const isVisible = await element.isVisible();
        console.log(`- ${tagName}[data-testid="${testId}"] (visible: ${isVisible})`);
      }

      // Check for question card specifically
      const questionCard = page.locator("[data-testid='question-card']");
      const questionCardExists = await questionCard.count();
      console.log(`Question card elements found: ${questionCardExists}`);
      
      if (questionCardExists > 0) {
        const isVisible = await questionCard.isVisible();
        console.log(`Question card visible: ${isVisible}`);
      }

      // Check for any error messages
      const errorMessages = await page.locator("text=/error/i").all();
      console.log("Error messages on attempt page:");
      for (const error of errorMessages) {
        const text = await error.textContent();
        console.log(`- ${text}`);
      }

      // Check page content
      const bodyText = await page.locator("body").textContent();
      console.log("Page body text (first 500 chars):", bodyText?.substring(0, 500));
    } else {
      console.log("Neither resume nor start button found");
    }
  });
});
