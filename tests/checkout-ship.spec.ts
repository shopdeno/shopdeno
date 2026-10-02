import { test, expect } from '@playwright/test';

// Acceptance test for the ship-to-address purchase path. Drives: product -> cart
// -> checkout -> ship intent -> contact + Kenyan shipping address -> shipping step,
// and asserts at least one delivery method is offered (the gate a real shipping
// purchase depends on).
//
// Currently RED on prod: the backend has no shipping zones configured, so
// availableShippingMethods is empty for every country and the UI shows
// "No delivery methods available for this address." Turns green once a shipping
// zone covering the address is set up on the Saleor backend.
//
// Runs against a live backend (local dev by default, or E2E_BASE_URL for a
// deployed env). Uses a Kenyan address to avoid countryArea/state requirements.

const PRODUCT_SLUG = 'maybach-oromats-sacco';

test('ship-to-address checkout offers a delivery method', async ({ page }) => {
  test.setTimeout(120_000); // Saleor (Render free tier) may cold-start.

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[browser] ${msg.text()}`);
  });

  // 1. Add a product to the cart.
  await page.goto(`/products/${PRODUCT_SLUG}`);
  const cookieReject = page.getByRole('button', { name: /reject non-essential|accept all/i });
  if (await cookieReject.first().isVisible().catch(() => false)) {
    await cookieReject.first().click();
  }
  const addToCart = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCart).toBeEnabled({ timeout: 40_000 });
  await addToCart.click();

  // 2. Go to checkout and choose "Ship to address".
  await page.getByRole('link', { name: /^checkout$/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByRole('button', { name: /ship to address/i }).click();

  // 3. Fill contact + Kenyan shipping address (country defaults to Kenya).
  // KE ship-form text inputs in order: 0=first 1=last 2=company(opt)
  // 3=street1 4=street2(opt) 5=city 6=postal (countryArea is hidden for KE).
  const form = page.locator('form');
  const text = form.locator('input[type="text"]');
  await page.getByPlaceholder('your@email.com').fill('qa-playwright@example.com');
  await text.nth(0).fill('QA');
  await text.nth(1).fill('Tester');
  await text.nth(3).fill('1 Test Street');
  await text.nth(5).fill('Nairobi');
  await text.nth(6).fill('00100');
  await page.getByRole('button', { name: /continue to shipping/i }).click();

  // 4. On the shipping step a delivery method must be available to purchase.
  await expect(
    page.getByRole('radio'),
  ).toBeVisible({ timeout: 30_000 });
});
