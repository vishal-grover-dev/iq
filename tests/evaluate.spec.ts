import { test, expect } from "@playwright/test";

test.describe("Evaluate Feature - Core User Journey", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/evaluate");
  });

  test("landing page: first-time user experience", async ({ page }) => {
    // Check for start button
    const startButton = page.getByRole("button", { name: /start new evaluation/i });
    await expect(startButton).toBeVisible();

    // Check for explainer text (4 bullet points mentioned in spec)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("60 questions");
    expect(pageContent).toContain("pause");
    expect(pageContent).toContain("resume");
  });

  test("CRITICAL: evaluation integrity - no mid-attempt feedback", async ({ page }) => {
    // Start new attempt
    await page.getByRole("button", { name: /start new evaluation/i }).click();

    // Wait for question to load
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Answer first question
    const firstOption = page.locator('[data-testid="option-button"]').first();
    await firstOption.click();

    const submitButton = page.getByRole("button", { name: /submit answer/i });
    await submitButton.click();

    // CRITICAL CHECKS: No feedback should be visible
    await page.waitForTimeout(1000); // Wait for any animations/transitions

    // Check that NO correctness indicators are visible
    await expect(page.locator("text=/correct!/i")).not.toBeVisible();
    await expect(page.locator("text=/incorrect!/i")).not.toBeVisible();

    // Check that NO explanation is visible
    await expect(page.locator('[data-testid="question-explanation"]')).not.toBeVisible();

    // Check that NO citations are visible during attempt
    await expect(page.locator('[data-testid="question-citations"]')).not.toBeVisible();

    // Verify progress indicator shows only count, not score
    const progressText = await page.textContent("body");
    expect(progressText).toMatch(/\d+\s*\/\s*60/); // Should show "X / 60"
    expect(progressText).not.toMatch(/score|correct|incorrect|accuracy/i);
  });

  test("question display quality", async ({ page }) => {
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Check question text is visible
    const questionText = page.locator('[data-testid="question-text"]');
    await expect(questionText).toBeVisible();

    // Check 4 options are present
    const options = page.locator('[data-testid="option-button"]');
    await expect(options).toHaveCount(4);

    // Check metadata is visible (topic, subtopic, difficulty)
    const metadata = page.locator('[data-testid="question-metadata"]');
    await expect(metadata).toBeVisible();

    // Check progress indicator
    const progress = page.locator('[data-testid="progress-indicator"]');
    await expect(progress).toBeVisible();
  });

  test("keyboard navigation", async ({ page }) => {
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Test number key selection (1-4)
    await page.keyboard.press("1");
    await page.waitForTimeout(300);

    // Check first option is selected
    const firstOption = page.locator('[data-testid="option-button"]').first();
    await expect(firstOption).toHaveAttribute("data-selected", "true");

    // Submit with Enter key
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Should transition to next question
    await expect(page.locator('[data-testid="question-card"]')).toBeVisible();
  });

  test("pause and resume flow", async ({ page }) => {
    // Start attempt and answer a question
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Answer first question
    await page.locator('[data-testid="option-button"]').first().click();
    await page.getByRole("button", { name: /submit answer/i }).click();
    await page.waitForTimeout(1000);

    // Pause
    const pauseButton = page.getByRole("button", { name: /pause/i });
    await pauseButton.click();

    // Should return to landing page
    await expect(page).toHaveURL(/\/evaluate$/);

    // Check for resume prompt
    const resumeButton = page.getByRole("button", { name: /resume/i });
    await expect(resumeButton).toBeVisible();

    // Verify progress is shown
    const progressText = await page.textContent("body");
    expect(progressText).toMatch(/\d+\s*\/\s*60/);
  });
});

test.describe("Evaluate Feature - Results Page", () => {
  test("results page: feedback visible ONLY after completion", async ({ page }) => {
    // This test assumes we can complete an attempt or mock the results page
    // For now, we'll navigate directly to a results page if one exists

    // TODO: This requires either:
    // 1. Completing a full 29-question attempt (slow)
    // 2. Mocking the attempt completion
    // 3. Creating a test fixture with a completed attempt

    test.skip("Implement after determining test data strategy");
  });

  test("results page: comprehensive analytics visible", async ({ page }) => {
    // TODO: Similar to above - needs completed attempt
    test.skip("Implement after determining test data strategy");
  });
});

test.describe("Evaluate Feature - Accessibility", () => {
  test("keyboard navigation: complete question flow", async ({ page }) => {
    await page.goto("/evaluate");

    // Tab to start button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");

    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Use number keys to select option
    await page.keyboard.press("2");
    await page.keyboard.press("Enter");

    await page.waitForTimeout(1000);

    // Should have advanced to next question
    await expect(page.locator('[data-testid="question-card"]')).toBeVisible();
  });

  test("ARIA labels present", async ({ page }) => {
    await page.goto("/evaluate");
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Check options have proper ARIA
    const options = page.locator('[data-testid="option-button"]');
    const firstOption = options.first();

    await expect(firstOption).toHaveAttribute("role", "button");
    await expect(firstOption).toHaveAttribute("aria-label", /.+/);
  });
});

test.describe("Evaluate Feature - Mobile Responsiveness", () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test("mobile: question card responsive", async ({ page }) => {
    await page.goto("/evaluate");
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    // Check question card is visible and not overflowing
    const questionCard = page.locator('[data-testid="question-card"]');
    await expect(questionCard).toBeVisible();

    const boundingBox = await questionCard.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test("mobile: options stack vertically", async ({ page }) => {
    await page.goto("/evaluate");
    await page.getByRole("button", { name: /start new evaluation/i }).click();
    await page.waitForSelector('[data-testid="question-card"]', { timeout: 10000 });

    const options = page.locator('[data-testid="option-button"]');

    // Get positions of first two options
    const firstBox = await options.nth(0).boundingBox();
    const secondBox = await options.nth(1).boundingBox();

    // Second option should be below first (vertical stacking)
    expect(secondBox?.y).toBeGreaterThan(firstBox?.y! + firstBox?.height!);
  });
});
