import { findLeadByDedupeHash, insertLead, logScrapeRun, getAllLeads } from '../db';
import { computeDedupeHash, isFuzzyDuplicate } from '../dedupe';
import { strugglingScraper } from './struggling-insolvenzbekanntmachungen';
import { successionScraper } from './succession-nexxtchange';
import type { ScraperModule } from './types';

export const SCRAPERS: ScraperModule[] = [strugglingScraper, successionScraper];

export interface ScrapeSummary {
  sourceId: string;
  newLeads: number;
  skippedDuplicates: number;
  error: string | null;
}

/** Runs one scraper module, dedupes its output against the DB, inserts new leads. */
export async function runScraper(scraper: ScraperModule): Promise<ScrapeSummary> {
  let newLeads = 0;
  let skippedDuplicates = 0;
  let error: string | null = null;

  try {
    const candidates = await scraper.run();
    const existing = getAllLeads();

    for (const candidate of candidates) {
      const hash = computeDedupeHash(candidate.name, candidate.location);
      if (findLeadByDedupeHash(hash)) {
        skippedDuplicates++;
        continue;
      }
      const fuzzyDupe = existing.some(
        (lead) =>
          lead.category === candidate.category &&
          isFuzzyDuplicate(candidate.name, candidate.location, lead.name, lead.location)
      );
      if (fuzzyDupe) {
        skippedDuplicates++;
        continue;
      }

      const inserted = insertLead({
        name: candidate.name,
        category: candidate.category,
        location: candidate.location,
        registerId: candidate.registerId,
        sourceUrl: candidate.sourceUrl,
        sourceName: candidate.sourceName,
        description: candidate.description,
        signalDate: candidate.signalDate,
        dedupeHash: hash,
      });
      existing.push(inserted);
      newLeads++;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  logScrapeRun(scraper.id, newLeads, error);
  return { sourceId: scraper.id, newLeads, skippedDuplicates, error };
}

export async function runAllScrapers(): Promise<ScrapeSummary[]> {
  const summaries: ScrapeSummary[] = [];
  for (const scraper of SCRAPERS) {
    summaries.push(await runScraper(scraper));
  }
  return summaries;
}
