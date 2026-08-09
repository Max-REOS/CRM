import * as cheerio from 'cheerio';
import type { RawLeadCandidate, ScraperModule } from './types';
import { throttle } from './rateLimiter';
import { isAllowedByRobots } from './robots';
import { launchBrowser, renderPage } from './browser';
import type { LeadCategory } from '../types';

/**
 * ⚠️ VERIFICATION NEEDED — written without live access to nexxt-change.org
 * (outbound web access is blocked in the build sandbox this was authored
 * in). nexxt-change.org is the central German succession/M&A marketplace
 * and lists BOTH sides:
 *   - "Verkaufsangebote" (sellers)  -> feeds `scalesell` (owners wanting an exit)
 *   - "Kaufgesuche"      (buyers)   -> feeds `buybusiness` (buyers looking to acquire)
 * Before relying on this in production, run it once against the live site
 * (`npm run scrape -- succession`) and adjust LISTING_URLS / selectors
 * below if the result count is 0 — the site is JS-driven, hence Playwright.
 */
const LISTING_URLS: { url: string; category: LeadCategory }[] = [
  { url: 'https://www.nexxt-change.org/DE/Verkaufsangebote/', category: 'scalesell' },
  { url: 'https://www.nexxt-change.org/DE/Kaufgesuche/', category: 'buybusiness' },
];

const RESULT_CARD_SELECTOR = '.result-list-item, .angebot-item, article.offer-card';
const FIELDS = {
  name: '.title, .offer-title, h3',
  location: '.location, .region, .plz-ort',
  description: '.description, .teaser, .summary',
  date: '.date, .published, time',
  detailLink: 'a[href]',
};

function parseGermanDate(text: string): string | null {
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const [, d, m, y] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

async function scrapeListing(url: string, category: LeadCategory): Promise<RawLeadCandidate[]> {
  await throttle(url);
  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    throw new Error(`Scraping disallowed by robots.txt: ${url}`);
  }

  const browser = await launchBrowser();
  let html: string;
  try {
    html = await renderPage(browser, url, RESULT_CARD_SELECTOR);
  } finally {
    await browser.close();
  }

  const $ = cheerio.load(html);
  const candidates: RawLeadCandidate[] = [];

  $(RESULT_CARD_SELECTOR).each((_, el) => {
    const card = $(el);
    const name = card.find(FIELDS.name).first().text().trim();
    if (!name) return;

    const location = card.find(FIELDS.location).first().text().trim() || null;
    const description = card.find(FIELDS.description).first().text().trim() || null;
    const dateText = card.find(FIELDS.date).first().text().trim();
    const href = card.find(FIELDS.detailLink).first().attr('href');
    const detailUrl = href ? new URL(href, url).toString() : url;

    candidates.push({
      name,
      category,
      location,
      description,
      signalDate: dateText ? parseGermanDate(dateText) : null,
      sourceUrl: detailUrl,
      sourceName: 'nexxt-change.org',
    });
  });

  return candidates;
}

export async function scrapeSuccession(): Promise<RawLeadCandidate[]> {
  const results: RawLeadCandidate[] = [];
  for (const { url, category } of LISTING_URLS) {
    results.push(...(await scrapeListing(url, category)));
  }
  return results;
}

export const successionScraper: ScraperModule = {
  id: 'succession-nexxtchange',
  categories: ['buybusiness', 'scalesell'],
  run: scrapeSuccession,
};
