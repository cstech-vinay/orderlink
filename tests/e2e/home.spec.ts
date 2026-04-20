import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("hero + 5 category bands render", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Everyday objects");
    // 5 category section headers
    for (const category of ["Kitchen", "Beauty", "Electronics", "Fashion", "Footwear"]) {
      await expect(
        page.getByRole("heading", { name: category, level: 2 }).first()
      ).toBeVisible();
    }
  });

  test("cookie consent banner appears on first visit + dismisses", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/");
    await expect(page.getByRole("dialog", { name: /cookie preferences/i })).toBeVisible();
    await page.getByRole("button", { name: /accept essentials/i }).click();
    await expect(
      page.getByRole("dialog", { name: /cookie preferences/i })
    ).not.toBeVisible();
  });

  test("footer resolves to all policy pages (no 404s)", async ({ page }) => {
    const checks = [
      "/about",
      "/contact",
      "/logistics",
      "/terms",
      "/privacy",
      "/refund-policy",
      "/shipping-policy",
      "/track",
    ];
    for (const path of checks) {
      const res = await page.goto(path);
      expect(res?.status(), `expected 200 for ${path}`).toBe(200);
    }
  });
});
