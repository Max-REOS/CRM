/**
 * Runs all scrapers against the committed SQLite DB (data/reonobilis.db) and
 * leaves the updated file on disk for the caller (GitHub Actions workflow)
 * to git-commit. See .github/workflows/daily-scrape.yml and README.md.
 *
 * Usage: npm run scrape [-- scraperId ...]
 *   npm run scrape                                    # run every scraper
 *   npm run scrape -- struggling-insolvenzbekanntmachungen
 */
import { SCRAPERS, runScraper } from '../lib/scrapers';

async function main() {
  const only = process.argv.slice(2);
  const scrapers = only.length ? SCRAPERS.filter((s) => only.includes(s.id)) : SCRAPERS;

  if (scrapers.length === 0) {
    console.error(`No matching scraper for: ${only.join(', ')}`);
    console.error(`Available: ${SCRAPERS.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  let hadError = false;
  for (const scraper of scrapers) {
    console.log(`\n→ running ${scraper.id} ...`);
    const summary = await runScraper(scraper);
    console.log(
      `  ${summary.newLeads} neue Leads, ${summary.skippedDuplicates} Duplikate übersprungen` +
        (summary.error ? ` — FEHLER: ${summary.error}` : '')
    );
    if (summary.error) hadError = true;
  }

  // Non-zero exit on scraper errors so the GH Actions run is flagged red,
  // even though partial results (from scrapers that did succeed) are kept.
  process.exit(hadError ? 1 : 0);
}

main();
