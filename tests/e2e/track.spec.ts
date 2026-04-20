import { test, expect } from "@playwright/test";

test.describe("/track lookup", () => {
  test("form renders + accepts either format hint", async ({ page }) => {
    await page.goto("/track");
    await expect(page.getByRole("heading", { name: /where is my order/i })).toBeVisible();
    await expect(page.getByText(/order.*looks like.*OL-2026-0001/i)).toBeVisible();
    // Button stays disabled until 4-digit trackKey is entered
    await page.getByLabel(/order or invoice number/i).fill("OL-2026-0001");
    const lookupBtn = page.getByRole("button", { name: /look up order/i });
    await expect(lookupBtn).toBeDisabled();
    await page.getByLabel(/mobile \(last 4/i).fill("1234");
    await expect(lookupBtn).toBeEnabled();
  });

  test("submitting unknown order shows 'couldn't find' error", async ({ page }) => {
    await page.goto("/track");
    await page.getByLabel(/order or invoice number/i).fill("OL-2026-9999");
    await page.getByLabel(/mobile \(last 4/i).fill("0000");
    await page.getByRole("button", { name: /look up order/i }).click();
    await expect(page.getByText(/couldn't find that order/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
