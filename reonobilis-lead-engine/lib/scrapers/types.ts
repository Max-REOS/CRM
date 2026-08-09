import type { LeadCategory } from '../types';

export interface RawLeadCandidate {
  name: string;
  category: LeadCategory;
  location?: string | null;
  registerId?: string | null;
  sourceUrl: string;
  sourceName: string;
  description?: string | null;
  signalDate?: string | null;
}

export interface ScraperModule {
  /** Machine name, also stored in scrape_runs.source_name. */
  id: string;
  categories: LeadCategory[];
  run(): Promise<RawLeadCandidate[]>;
}
