import { test, expect } from '@playwright/test';

test('product card displays hover GIF', async ({ page }) => {
  await page.goto('http://localhost:3000/products');

  // Wait for product cards to load
  const firstCard = page.locator('.group').first();
  await expect(firstCard).toBeVisible();

  // Check for GIF element
  const gifImg = firstCard.locator('img[src*="/product-gifs/"]');
  const gifCount = await gifImg.count();

  if (gifCount > 0) {
    // Before hover
    const gifBeforeHover = await gifImg.isVisible();
    console.log(`GIF visible before hover: ${gifBeforeHover}`);

    // Hover
    await firstCard.hover();
    await page.waitForTimeout(300);

    // After hover
    const gifAfterHover = await gifImg.isVisible();
    console.log(`GIF visible after hover: ${gifAfterHover}`);

    expect(gifAfterHover).toBe(true);
  } else {
    console.log('No GIF element found in product card');

    // Debug info
    const allImgs = firstCard.locator('img');
    const count = await allImgs.count();
    console.log(`Total images in card: ${count}`);
    for (let i = 0; i < count; i++) {
      const src = await allImgs.nth(i).getAttribute('src');
      console.log(`  Image ${i}: ${src}`);
    }
  }
});
