import { test, expect } from '@playwright/test';

// Acceptance test for the critical purchase path: a real user adds a product to
// the cart and completes a studio-pickup order. Default payment method is
// "pay at studio on collection" (no external gateway), so this drives the live
// /api/checkout/complete flow end-to-end: cart (Saleor checkout) -> billing
// address -> warehouse delivery method -> transactionCreate (AUTHORIZED) ->
// checkoutComplete -> order confirmation.
//
// NOTE: each run creates a real AUTHORIZED (unpaid) pickup order in Saleor.
// Runs against the local dev server (playwright.config webServer) which talks to
// the live Saleor backend, so the backend must be reachable/awake.

const PRODUCT_SLUG = 'maybach-oromats-sacco';

test('user can complete a studio-pickup purchase', async ({ page }) => {
  test.setTimeout(120_000); // Saleor (Render free tier) may cold-start.

  // Surface browser console errors (checkout mutations log failures there).
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[browser] ${msg.text()}`);
  });

  // 1. Open a product and add it to the cart.
  await page.goto(`/products/${PRODUCT_SLUG}`);

  // Dismiss cookie consent if present (overlays checkout controls otherwise).
  const cookieReject = page.getByRole('button', { name: /reject non-essential|accept all/i });
  if (await cookieReject.first().isVisible().catch(() => false)) {
    await cookieReject.first().click();
  }
  const addToCart = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCart).toBeEnabled({ timeout: 40_000 });
  await addToCart.click();

  // 2. Cart drawer opens on add -> go to checkout.
  await page.getByRole('link', { name: /^checkout$/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 3. Choose free studio collection.
  await page.getByRole('button', { name: /collect at studio/i }).click();

  // 4. Fill contact info (collect form).
  const form = page.locator('form');
  await page.getByPlaceholder('your@email.com').fill('qa-playwright@example.com');
  await form.locator('input[type="text"]').nth(0).fill('QA');
  await form.locator('input[type="text"]').nth(1).fill('Tester');
  await form.locator('input[type="tel"]').fill('+254712345678');
  await page.getByRole('button', { name: /continue to payment/i }).click();

  // 5. Payment step: default method is pay-at-studio. Accept terms and complete.
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /complete order/i }).click();

  // 6. Order confirmation is shown.
  await expect(
    page.getByRole('heading', { name: /order confirmed/i }),
  ).toBeVisible({ timeout: 40_000 });

  // Surface the created order so it can be found/cancelled in Saleor.
  const confirmation = await page
    .getByText(/your order number is/i)
    .textContent();
  console.log(`CREATED ORDER -> ${confirmation?.trim()}`);
});
