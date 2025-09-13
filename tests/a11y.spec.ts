import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("accessibility", () => {
  const routes = ["/", "/upload"];

  for (const route of routes) {
    test(`axe: ${route}`, async ({ page }, testInfo) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      if (results.violations.length > 0) {
        testInfo.annotations.push({
          type: "a11y-violations",
          description: JSON.stringify(results.violations, null, 2),
        });
        console.warn("[axe] violations found:", JSON.stringify(results.violations, null, 2));
      }
    });
  }
});
