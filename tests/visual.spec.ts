import { test, expect } from "@playwright/test";

const routes = ["/", "/upload"];

for (const route of routes) {
  test.describe(`visual: ${route}`, () => {
    test(`should match snapshots for ${route}`, async ({ page, browserName }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      // Reduce flakiness: wait for fonts and animations to settle
      await page.addStyleTag({ content: "* { transition: none !important; animation: none !important; }" });
      const fileSafe = route === "/" ? "home" : route.replace(/\//g, "_");
      await expect(page).toHaveScreenshot(`${fileSafe}-${browserName}.png`, {
        fullPage: true,
        animations: "disabled",
      });
    });
  });
}
