import * as cheerio from 'cheerio';
import type { RawLeadCandidate, ScraperModule } from './types';
import { throttle } from './rateLimiter';
import { isAllowedByRobots } from './robots';
import { launchBrowser, renderPage } from './browser';

/**
 * ⚠️ VERIFICATION NEEDED — this scraper was written without live access to
 * the target site (outbound web access is blocked in the build sandbox this
 * was authored in). Structure below reflects the publicly documented search
 * flow of insolvenzbekanntmachungen.de as of authoring time. Before relying
 * on this in production:
 *   1. Run it once manually (`npm run scrape -- struggling`) against the
 *      live site and inspect `scrape_runs.errors` / the returned count.
 *   2. If it returns 0 results, open the search URL below in a real browser,
 *      inspect the results DOM, and update RESULT_ROW_SELECTOR / the field
 *      selectors accordingly.
 */
const CONFIG = {
  baseUrl: 'https://www.insolvenzbekanntmachungen.de',
  // Public full-text search, scoped to Bavaria, sorted newest first.
  searchUrl:
    'https://www.insolvenzbekanntmachungen.de/apps/insolvenzbekanntmachungen/index.php?bl=Bayern&sortierung=neu',
  resultRowSelector: '.suchergebnis-eintrag, table.ergebnisliste tr.ergebnis-zeile',
  fields: {
    name: '.firma, .schuldner-name, td.firma',
    location: '.ort, .sitz, td.ort',
    registerId: '.aktenzeichen, td.aktenzeichen',
    description: '.bekanntmachungstext, td.text',
    date: '.datum, td.datum',
  },
};

async function fetchSearchResultsHtml(): Promise<string> {
  await throttle(CONFIG.searchUrl);
  const allowed = await isAllowedByRobots(CONFIG.searchUrl);
  if (!allowed) {
    throw new Error(`Scraping disallowed by robots.txt: ${CONFIG.searchUrl}`);
  }

  // The site is known to render results via server-side includes but may
  // also inject some content client-side — Playwright covers both cases
  // safely (a plain fetch would be cheaper if confirmed static, see TODO above).
  const browser = await launchBrowser();
  try {
    return await renderPage(browser, CONFIG.searchUrl, CONFIG.resultRowSelector);
  } finally {
    await browser.close();
  }
}

function parseGermanDate(text: string): string | null {
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export async function scrapeStruggling(): Promise<RawLeadCandidate[]> {
  const html = await fetchSearchResultsHtml();
  const $ = cheerio.load(html);
  const candidates: RawLeadCandidate[] = [];

  $(CONFIG.resultRowSelector).each((_, el) => {
    const row = $(el);
    const name = row.find(CONFIG.fields.name).first().text().trim();
    if (!name) return;

    const location = row.find(CONFIG.fields.location).first().text().trim() || null;
    const registerId = row.find(CONFIG.fields.registerId).first().text().trim() || null;
    const description = row.find(CONFIG.fields.description).first().text().trim() || null;
    const dateText = row.find(CONFIG.fields.date).first().text().trim();

    candidates.push({
      name,
      category: 'struggling',
      location,
      registerId,
      description,
      signalDate: dateText ? parseGermanDate(dateText) : null,
      sourceUrl: CONFIG.searchUrl,
      sourceName: 'insolvenzbekanntmachungen.de',
    });
  });

  return candidates;
}

export const strugglingScraper: ScraperModule = {
  id: 'struggling-insolvenzbekanntmachungen',
  categories: ['struggling'],
  run: scrapeStruggling,
};
