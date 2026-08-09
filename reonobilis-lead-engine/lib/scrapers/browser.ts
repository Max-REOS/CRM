import { chromium, type Browser } from 'playwright';

/**
 * Launches Chromium for scraping JS-heavy pages. Respects
 * PLAYWRIGHT_BROWSERS_PATH / a pre-installed browser (used by the dev
 * sandbox); on CI, `npx playwright install chromium` provides one.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

/** Fetches `url` in a fresh page and returns the fully rendered HTML. */
export async function renderPage(browser: Browser, url: string, waitForSelector?: string): Promise<string> {
  const page = await browser.newPage({
    userAgent: 'ReonobilisLeadEngine/1.0 (+internal business tool; contact: max@reonobilis.de)',
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 15_000 }).catch(() => {
        // Selector never showed up — likely the site structure changed.
        // The caller's own zero-results check will surface this in scrape_runs.errors.
      });
    }
    return await page.content();
  } finally {
    await page.close();
  }
}
