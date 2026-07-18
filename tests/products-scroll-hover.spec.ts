import { test, expect } from '@playwright/test';

test('find and hover alpine product card', async ({ page }) => {
  await page.goto('/products');
  await page.waitForLoadState('networkidle');

  // Look for Alpine product card
  const alpineCard = page.locator('a.group:has-text("Alpine")').first();
  await expect(alpineCard).toBeVisible({ timeout: 5000 });

  // Scroll to Alpine card
  await alpineCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Before hover: only product image should exist
  const baseImg = alpineCard.locator('img').first();
  await expect(baseImg).toBeVisible();
  const baseSrc = await baseImg.getAttribute('src');
  console.log(`✅ Base image: ${baseSrc?.substring(0, 80)}`);

  // Hover
  await alpineCard.hover();

  // Wait for GIF img to appear (Next.js Image renders async)
  const gifImg = alpineCard.locator('img[src*="/product-gifs/"]');
  await expect(gifImg).toBeVisible({ timeout: 3000 });

  const gifSrc = await gifImg.getAttribute('src');
  console.log(`✅ GIF appeared on hover: ${gifSrc?.substring(0, 80)}`);

  expect(gifSrc).toContain('/product-gifs/');
});
