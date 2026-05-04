import { test, expect } from "@playwright/test";

test("home → category → product → merchant interstitial", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Things worth")).toBeVisible();

  // Click first sub-brand card
  await page.getByRole("link", { name: /TechLand/i }).first().click();
  await expect(page).toHaveURL(/\/shop\/techland/);

  // Click first product card
  await page.locator("a[href^='/p/']").first().click();
  await expect(page).toHaveURL(/\/p\//);

  // Click first merchant CTA
  await page.getByRole("link", { name: /Go to Amazon/ }).first().click();
  await expect(page).toHaveURL(/\/go\//);
  await expect(page.getByText(/Off you go|Link not yet available/)).toBeVisible();
});
