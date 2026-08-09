import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Lead, LeadCategory, LeadStatus, ScrapeRun, StatusHistoryEntry } from './types';

// Vercel's serverless filesystem is read-only outside /tmp, and /tmp does not
// persist across invocations/deploys. The DB file is therefore treated as
// build-time state: GitHub Actions runs the scrapers and commits the updated
// file back to the repo (see .github/workflows/daily-scrape.yml + README).
// At runtime we only ever read it (or write locally during `npm run dev` /
// the scrape script itself, which always runs outside Vercel).
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'reonobilis.db')
  : path.join(process.cwd(), 'data', 'reonobilis.db');

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

if (process.env.VERCEL) {
  const committed = path.join(process.cwd(), 'data', 'reonobilis.db');
  ensureDir();
  if (fs.existsSync(committed) && !fs.existsSync(DB_PATH)) {
    fs.copyFileSync(committed, DB_PATH);
  }
} else {
  ensureDir();
}

const db = new Database(DB_PATH);
// Deliberately NOT WAL mode: WAL splits state across a companion -wal file,
// which complicates both the git-commit-the-db-file workflow (see below)
// and the Vercel /tmp-copy-on-cold-start bootstrap above. This is a small,
// single-writer, low-traffic internal tool — the default rollback journal
// keeps everything in the one .db file, which is what we actually want.

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    register_id TEXT,
    source_url TEXT,
    source_name TEXT,
    description TEXT,
    signal_date TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT NOT NULL DEFAULT '',
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
    dedupe_hash TEXT NOT NULL UNIQUE
  );

  CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_first_seen ON leads(first_seen);

  CREATE TABLE IF NOT EXISTS status_history (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (datetime('now')),
    changed_by TEXT
  );

  CREATE TABLE IF NOT EXISTS scrape_runs (
    id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    run_at TEXT NOT NULL DEFAULT (datetime('now')),
    new_leads_found INTEGER NOT NULL DEFAULT 0,
    errors TEXT
  );
`);

interface RawLeadRow {
  id: string;
  name: string;
  category: string;
  location: string | null;
  register_id: string | null;
  source_url: string | null;
  source_name: string | null;
  description: string | null;
  signal_date: string | null;
  status: string;
  notes: string;
  first_seen: string;
  last_updated: string;
  dedupe_hash: string;
}

interface RawStatusHistoryRow {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string | null;
}

interface RawScrapeRunRow {
  id: string;
  source_name: string;
  run_at: string;
  new_leads_found: number;
  errors: string | null;
}

function rowToLead(row: RawLeadRow): Lead {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Lead['category'],
    location: row.location,
    registerId: row.register_id,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    description: row.description,
    signalDate: row.signal_date,
    status: row.status as Lead['status'],
    notes: row.notes,
    firstSeen: row.first_seen,
    lastUpdated: row.last_updated,
    dedupeHash: row.dedupe_hash,
  };
}

export function getAllLeads(): Lead[] {
  const rows = db.prepare('SELECT * FROM leads ORDER BY first_seen DESC').all() as RawLeadRow[];
  return rows.map(rowToLead);
}

export function getLeadById(id: string): Lead | undefined {
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as RawLeadRow | undefined;
  return row ? rowToLead(row) : undefined;
}

export function findLeadByDedupeHash(hash: string): Lead | undefined {
  const row = db.prepare('SELECT * FROM leads WHERE dedupe_hash = ?').get(hash) as RawLeadRow | undefined;
  return row ? rowToLead(row) : undefined;
}

export interface NewLeadInput {
  name: string;
  category: LeadCategory;
  location?: string | null;
  registerId?: string | null;
  sourceUrl?: string | null;
  sourceName?: string | null;
  description?: string | null;
  signalDate?: string | null;
  dedupeHash: string;
}

export function insertLead(input: NewLeadInput): Lead {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO leads
      (id, name, category, location, register_id, source_url, source_name, description, signal_date, dedupe_hash)
     VALUES (@id, @name, @category, @location, @registerId, @sourceUrl, @sourceName, @description, @signalDate, @dedupeHash)`
  ).run({
    id,
    name: input.name,
    category: input.category,
    location: input.location ?? null,
    registerId: input.registerId ?? null,
    sourceUrl: input.sourceUrl ?? null,
    sourceName: input.sourceName ?? null,
    description: input.description ?? null,
    signalDate: input.signalDate ?? null,
    dedupeHash: input.dedupeHash,
  });
  db.prepare(
    `INSERT INTO status_history (id, lead_id, old_status, new_status, changed_by)
     VALUES (?, ?, NULL, 'new', 'scraper')`
  ).run(randomUUID(), id);
  return getLeadById(id)!;
}

export function updateLeadStatus(id: string, newStatus: LeadStatus, changedBy: string): Lead | undefined {
  const existing = getLeadById(id);
  if (!existing) return undefined;
  db.prepare(`UPDATE leads SET status = ?, last_updated = datetime('now') WHERE id = ?`).run(newStatus, id);
  db.prepare(
    `INSERT INTO status_history (id, lead_id, old_status, new_status, changed_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(randomUUID(), id, existing.status, newStatus, changedBy);
  return getLeadById(id);
}

export function updateLeadNotes(id: string, notes: string): Lead | undefined {
  db.prepare(`UPDATE leads SET notes = ?, last_updated = datetime('now') WHERE id = ?`).run(notes, id);
  return getLeadById(id);
}

export function getStatusHistory(leadId: string): StatusHistoryEntry[] {
  const rows = db
    .prepare('SELECT * FROM status_history WHERE lead_id = ? ORDER BY changed_at ASC')
    .all(leadId) as RawStatusHistoryRow[];
  return rows.map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    oldStatus: row.old_status as LeadStatus | null,
    newStatus: row.new_status as LeadStatus,
    changedAt: row.changed_at,
    changedBy: row.changed_by,
  }));
}

export function logScrapeRun(sourceName: string, newLeadsFound: number, errors: string | null): ScrapeRun {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO scrape_runs (id, source_name, new_leads_found, errors) VALUES (?, ?, ?, ?)`
  ).run(id, sourceName, newLeadsFound, errors);
  const row = db.prepare('SELECT * FROM scrape_runs WHERE id = ?').get(id) as RawScrapeRunRow;
  return {
    id: row.id,
    sourceName: row.source_name,
    runAt: row.run_at,
    newLeadsFound: row.new_leads_found,
    errors: row.errors,
  };
}

export function getRecentScrapeRuns(limit = 20): ScrapeRun[] {
  const rows = db
    .prepare('SELECT * FROM scrape_runs ORDER BY run_at DESC LIMIT ?')
    .all(limit) as RawScrapeRunRow[];
  return rows.map((row) => ({
    id: row.id,
    sourceName: row.source_name,
    runAt: row.run_at,
    newLeadsFound: row.new_leads_found,
    errors: row.errors,
  }));
}

export default db;
