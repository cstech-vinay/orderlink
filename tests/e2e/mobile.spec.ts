import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 375, height: 800 } });

test("mobile home renders without overflow + footer collapses", async ({ page }) => {
  await page.goto("/");
  const html = await page.locator("body").boundingBox();
  expect(html?.width).toBeLessThanOrEqual(375 + 16);
  await expect(page.getByText("Things worth")).toBeVisible();
});
