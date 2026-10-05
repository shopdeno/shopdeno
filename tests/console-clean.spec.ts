import { test, expect, type Page } from '@playwright/test';

// Guards the storefront against first-party console noise (the class of report
// that sent us chasing PesaPal's own iframe JS on 2026-10-05). Only errors
// whose source URL is our own origin fail the test — third-party frames
// (PesaPal iframe, Cardinal 3DS, Vercel internals on other origins) are
// reported to the log for triage but never fail the build, because we cannot
// patch code served from pay.pesapal.com.
const BASE = 'https://shop.dennis-muraguri.co.ke';

type ConsoleFault = { page: string; kind: string; text: string; url: string };

async function collectFirstPartyErrors(page: Page, url: string, faults: ConsoleFault[]) {
  const own = new URL(BASE).origin;
  const record = (kind: string, text: string, locUrl: string) => {
    const entry = { page: url, kind, text: text.slice(0, 300), url: locUrl.slice(0, 160) };
    if (!locUrl || locUrl.startsWith(own) || locUrl === '') {
      faults.push(entry);
    } else {
      console.log(`  (third-party, non-blocking) [${kind}] ${text.slice(0, 160)} ← ${locUrl.slice(0, 100)}`);
    }
  };
  page.on('console', (msg) => {
    if (msg.type() === 'error') record('console.error', msg.text(), msg.location()?.url ?? '');
  });
  page.on('pageerror', (err) => record('pageerror', String(err), ''));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
}

test('first-party pages emit zero console errors', async ({ page }) => {
  test.setTimeout(180000);
  const faults: ConsoleFault[] = [];

  await collectFirstPartyErrors(page, `${BASE}/`, faults);
  await collectFirstPartyErrors(page, `${BASE}/products`, faults);

  // First product detail page (whatever is listed first — grid is live data).
  await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const firstHref = await page.locator('a[href*="/products/"]').first().getAttribute('href').catch(() => null);
  if (firstHref) {
    await collectFirstPartyErrors(page, `${BASE}${firstHref}`, faults);
  } else {
    console.log('  (no product link found — PDP check skipped)');
  }

  // Checkout renders (possibly a redirect without a cart — console still captured).
  await collectFirstPartyErrors(page, `${BASE}/checkout`, faults);

  if (faults.length) {
    console.log('First-party console faults:\n' + JSON.stringify(faults, null, 2));
  }
  expect(faults).toEqual([]);
});
