import { test, expect } from "@playwright/test";

test("search via header navigates to /shop?q=...", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/Search/).fill("earbuds");
  await page.getByPlaceholder(/Search/).press("Enter");
  await expect(page).toHaveURL(/\/shop\?q=earbuds/);
  await expect(page.getByText(/earbuds/i).first()).toBeVisible();
});
