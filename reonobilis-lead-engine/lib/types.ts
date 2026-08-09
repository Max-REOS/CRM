export const LEAD_CATEGORIES = [
  'website',
  'struggling',
  'newproduct',
  'newmarket',
  'restructure',
  'investment',
  'buybusiness',
  'scalesell',
] as const;

export type LeadCategory = (typeof LEAD_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<LeadCategory, string> = {
  website: 'Website-Angebot',
  struggling: 'Struggling / Finanznot',
  newproduct: 'Produkt-Launch',
  newmarket: 'Markterschließung',
  restructure: 'Restrukturierung',
  investment: 'Investment gesucht',
  buybusiness: 'Firma kaufen wollen',
  scalesell: 'Scale & Exit',
};

export const LEAD_STATUSES = ['new', 'contacted', 'negotiating', 'closed', 'lost'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  negotiating: 'Verhandlung',
  closed: 'Closed',
  lost: 'Verloren',
};

export interface Lead {
  id: string;
  name: string;
  category: LeadCategory;
  location: string | null;
  registerId: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  description: string | null;
  signalDate: string | null;
  status: LeadStatus;
  notes: string;
  firstSeen: string;
  lastUpdated: string;
  dedupeHash: string;
}

export interface StatusHistoryEntry {
  id: string;
  leadId: string;
  oldStatus: LeadStatus | null;
  newStatus: LeadStatus;
  changedAt: string;
  changedBy: string | null;
}

export interface ScrapeRun {
  id: string;
  sourceName: string;
  runAt: string;
  newLeadsFound: number;
  errors: string | null;
}
