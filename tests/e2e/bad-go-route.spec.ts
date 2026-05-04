import { test, expect } from "@playwright/test";

test("/go/ with bad ids redirects home", async ({ page }) => {
  await page.goto("/go/nope/nope", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/");
});
