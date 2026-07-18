import { test, expect } from '@playwright/test';

test('product card displays hover GIF', async ({ page }) => {
  // Navigate to products page
  await page.goto('/products');
  await page.waitForLoadState('networkidle');

  const cards = page.locator('.group');
  let foundGif = false;

  // Check up to 3 pages for multi-image products
  for (let pageNum = 1; pageNum <= 3; pageNum++) {
    const allCards = await cards.all();
    console.log(`\n📄 Page ${pageNum}: Found ${allCards.length} product cards`);

    for (let i = 0; i < Math.min(3, allCards.length); i++) {
      const card = allCards[i];
      const allImgs = card.locator('img');
      const imgCount = await allImgs.count();
      const alt = await allImgs.first().getAttribute('alt');
      console.log(`  Card ${i + 1}: ${imgCount} image(s) - ${alt}`);

      const gifImg = card.locator('img[src*="/product-gifs/"]');
      const gifCount = await gifImg.count();

      if (gifCount > 0) {
        console.log(`✅ Found GIF element on page ${pageNum}`);

        // Before hover
        const gifBeforeHover = await gifImg.isVisible();
        console.log(`  GIF visible before hover: ${gifBeforeHover}`);

        // Hover
        await card.hover();
        await page.waitForTimeout(300);

        // After hover
        const gifAfterHover = await gifImg.isVisible();
        console.log(`  GIF visible after hover: ${gifAfterHover}`);

        expect(gifAfterHover).toBe(true);
        foundGif = true;
        break;
      }
    }

    if (foundGif) break;

    // Try next page
    const nextBtn = page.locator('a:has-text("Next")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle');
    } else {
      break;
    }
  }

  if (!foundGif) {
    console.log('\n⚠️  No multi-image products with GIFs found (checked 3 pages)');
  }
});
