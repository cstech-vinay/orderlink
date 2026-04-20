import { test, expect } from "@playwright/test";

// These tests exercise the checkout form + coupon + pincode logic.
// They intentionally STOP before opening the Razorpay modal because the modal
// is cross-origin + iframed and interacting with it reliably from Playwright
// requires Razorpay's test-mode iframe helpers. That part stays a manual
// verification step for now (test card 4111 1111 1111 1111 + any future exp).

test.describe("checkout form", () => {
  test("serviceable pincode auto-fills city + state + enables order summary", async ({
    page,
  }) => {
    await page.goto("/checkout?sku=oil-dispenser");

    await page.getByLabel(/full name/i).fill("Playwright Tester");
    await page.getByLabel(/mobile \(10-digit\)/i).fill("9876543210");
    await page
      .getByLabel(/email/i)
      .fill(`playwright-${Date.now()}@example.com`);
    await page.getByLabel(/address line 1/i).fill("221B Baker Street");

    // Pincode field auto-populates city + state on serviceable hit
    await page.getByLabel(/pincode/i).fill("411014");
    await expect(page.getByText(/we deliver to pune/i)).toBeVisible({
      timeout: 5_000,
    });

    // City + State fields now show Pune/Maharashtra (auto-filled)
    await expect(page.getByLabel(/city/i)).toHaveValue("Pune");
    await expect(page.getByLabel(/state/i)).toHaveValue("Maharashtra");

    // Pay button reachable + enabled
    const pay = page.getByRole("button", { name: /pay .* securely/i });
    await expect(pay).toBeEnabled();
  });

  test("unserviceable pincode surfaces error + disables Pay", async ({ page }) => {
    await page.goto("/checkout?sku=oil-dispenser");
    await page.getByLabel(/full name/i).fill("Playwright Tester");
    await page.getByLabel(/mobile \(10-digit\)/i).fill("9876543210");
    await page
      .getByLabel(/email/i)
      .fill(`playwright-${Date.now()}@example.com`);
    await page.getByLabel(/address line 1/i).fill("221B Baker Street");

    await page.getByLabel(/pincode/i).fill("999999");
    await expect(page.getByText(/sorry, we don't ship here yet/i)).toBeVisible({
      timeout: 5_000,
    });

    await expect(page.getByText(/complete these to pay/i)).toBeVisible();
    const pay = page.getByRole("button", { name: /pay .* securely/i });
    await expect(pay).toBeDisabled();
  });

  test("WELCOME10 coupon applies once valid email is in", async ({ page }) => {
    await page.goto("/checkout?sku=oil-dispenser");
    await page.getByLabel(/full name/i).fill("Playwright Coupon");
    await page.getByLabel(/mobile \(10-digit\)/i).fill("9876543210");
    await page
      .getByLabel(/email/i)
      .fill(`playwright-coupon-${Date.now()}@example.com`);
    await page.getByLabel(/address line 1/i).fill("221B Baker Street");
    await page.getByLabel(/pincode/i).fill("411014");

    // Apply WELCOME10
    await page.getByPlaceholder("WELCOME10").fill("WELCOME10");
    await page.getByRole("button", { name: /^apply$/i }).click();
    await expect(page.getByText(/WELCOME10.*applied/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/₹10 off/)).toBeVisible();
  });
});

test.describe("checkout prepaid submit (stops at Razorpay modal)", () => {
  test.skip(
    !process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_"),
    "Requires test-mode Razorpay keys"
  );

  test("Pay button reaches /api/orders (modal opens)", async ({ page }) => {
    await page.goto("/checkout?sku=oil-dispenser");
    await page.getByLabel(/full name/i).fill("Playwright Tester");
    await page.getByLabel(/mobile \(10-digit\)/i).fill("9876543210");
    await page
      .getByLabel(/email/i)
      .fill(`playwright-${Date.now()}@example.com`);
    await page.getByLabel(/address line 1/i).fill("221B Baker Street");
    await page.getByLabel(/pincode/i).fill("411014");
    await expect(page.getByText(/we deliver to pune/i)).toBeVisible({
      timeout: 5_000,
    });

    // Watch for the /api/orders POST, then click Pay
    const ordersReq = page.waitForResponse(
      (r) => r.url().includes("/api/orders") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: /pay .* securely/i }).click();
    const res = await ordersReq;
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.razorpayOrderId).toMatch(/^order_/);
    // Modal DOM appears (iframe loaded) — we don't interact with it
    await expect(page.locator("iframe").first()).toBeVisible({ timeout: 10_000 });
  });
});
