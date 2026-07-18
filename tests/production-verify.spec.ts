import { test, expect } from '@playwright/test';

const BASE = 'https://shop.dennis-muraguri.co.ke';

test('hover GIFs appear on product cards with multiple images', async ({ page }) => {
  await page.goto(`${BASE}/products`);
  await page.waitForLoadState('networkidle');

  const cards = await page.locator('.group').all();
  console.log(`Product cards found: ${cards.length}`);

  let foundGif = false;

  for (const card of cards) {
    // Hover the card
    await card.hover();
    await page.waitForTimeout(150);

    // Check if a GIF img appeared after hover
    const gifImg = card.locator('img[src*="/product-gifs/"]');
    const gifCount = await gifImg.count();

    if (gifCount > 0) {
      const gifSrc = await gifImg.getAttribute('src');
      console.log(`✅ GIF appeared on hover: ${gifSrc}`);

      const visible = await gifImg.isVisible();
      console.log(`  GIF visible: ${visible}`);
      expect(visible).toBe(true);

      // Verify the GIF asset loads (HTTP 200)
      const resp = await page.request.get(`${BASE}${gifSrc}`);
      console.log(`  GIF HTTP status: ${resp.status()}`);
      expect(resp.status()).toBe(200);

      foundGif = true;
      break;
    }
  }

  if (!foundGif) {
    // Debug: check if any product has multiple images in the query
    const firstCard = cards[0];
    const html = await firstCard.innerHTML();
    console.log(`No GIF found. First card HTML snippet:\n${html.substring(0, 600)}`);
    throw new Error('No GIF appeared on hover for any product card — check if products have multiple media items in PRODUCTS_QUERY');
  }
});

test('product listing images load without errors', async ({ page }) => {
  const failedImages: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    // Track image failures (exclude GIF 404s which are expected for single-image products)
    if (url.match(/\.(jpg|jpeg|png|webp|avif)/i) && status >= 400) {
      failedImages.push(`${status}: ${url.split('?')[0].split('/').slice(-1)[0]}`);
    }
  });

  await page.goto(`${BASE}/products`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  if (failedImages.length > 0) {
    console.log(`Failed images on /products (${failedImages.length}):`);
    failedImages.slice(0, 10).forEach(img => console.log(`  ${img}`));
  } else {
    console.log('✅ All product listing images loaded successfully');
  }

  expect(failedImages).toHaveLength(0);
});

test('product detail pages have no broken images', async ({ page }) => {
  // Get multi-image product slugs from Saleor Cloud
  const multiImageSlugs = [
    'alpine-route-100-kiambu',
    'amber-rose-kacose-sacco-square-format',
    'amber-rose-side-view-kacose-sacco',
  ];

  // Also sample some regular products
  await page.goto(`${BASE}/products`);
  await page.waitForLoadState('networkidle');
  const allLinks = await page.locator('a.group[href^="/products/"]').all();
  const sampledSlugs = (await Promise.all(allLinks.slice(0, 7).map(l => l.getAttribute('href')))).filter(Boolean) as string[];

  const slugsToTest = [...new Set([
    ...multiImageSlugs.map(s => `/products/${s}`),
    ...sampledSlugs,
  ])].slice(0, 12);

  console.log(`Testing ${slugsToTest.length} product detail pages`);

  const allFailed: string[] = [];

  for (const path of slugsToTest) {
    const failed: string[] = [];

    const handler = (response: any) => {
      const url = response.url();
      const status = response.status();
      if (url.match(/\.(jpg|jpeg|png|webp|avif|gif)/i) && status >= 400) {
        failed.push(`${status}: ${url.split('/').slice(-1)[0].split('?')[0]}`);
      }
    };

    page.on('response', handler);

    try {
      await page.goto(`${BASE}${path}`, { timeout: 15000 });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
    } catch {
      console.log(`  ⚠️ Timeout on ${path}`);
    }

    page.off('response', handler);

    if (failed.length > 0) {
      console.log(`  ❌ ${path}: ${failed.length} broken image(s)`);
      failed.forEach(f => console.log(`     ${f}`));
      allFailed.push(...failed);
    } else {
      console.log(`  ✅ ${path}`);
    }
  }

  expect(allFailed, `${allFailed.length} broken images across product pages`).toHaveLength(0);
});
