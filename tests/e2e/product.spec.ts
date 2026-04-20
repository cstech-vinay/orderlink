import { test, expect } from "@playwright/test";

test.describe("product detail page", () => {
  test("live product shows Buy Now + WhatsApp inline prompt", async ({ page }) => {
    await page.goto("/p/oil-dispenser");
    // Buy Now CTA routes to /checkout
    const buyNow = page.getByRole("link", { name: /buy now/i });
    await expect(buyNow).toBeVisible();
    await expect(buyNow).toHaveAttribute("href", /\/checkout\?sku=oil-dispenser/);

    // Trust chip list
    await expect(page.getByText(/15-day guarantee or shipping refunded/i)).toBeVisible();

    // WhatsApp help prompt
    await expect(page.getByText(/Unsure if this is right for you/i)).toBeVisible();
  });

  test("coming-soon product shows badge, no Buy Now", async ({ page }) => {
    await page.goto("/p/rice-face-wash");
    await expect(page.getByText(/coming soon/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /buy now/i })).toHaveCount(0);
  });

  test("customer reviews section renders with filter chips", async ({ page }) => {
    await page.goto("/p/oil-dispenser");
    await expect(page.getByRole("heading", { name: /customer reviews/i })).toBeVisible();
    // "Verified buyer" chip appears at least once (we seeded all reviews verified)
    await expect(page.getByText(/verified buyer/i).first()).toBeVisible();
    // 5★ filter chip
    await expect(page.getByRole("button", { name: /5★/ }).first()).toBeVisible();
  });
});
