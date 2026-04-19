import fs from 'fs';
import path from 'path';
import { Lead } from './types';

const SOURCE_PATH = path.join(process.cwd(), 'data', 'leads.json');
const DB_PATH =
  process.env.NODE_ENV === 'production' ? '/tmp/reos-leads.json' : SOURCE_PATH;

function ensureDb(): void {
  if (!fs.existsSync(DB_PATH)) {
    try {
      const seed = fs.readFileSync(SOURCE_PATH, 'utf-8');
      fs.writeFileSync(DB_PATH, seed, 'utf-8');
    } catch {
      fs.writeFileSync(DB_PATH, '[]', 'utf-8');
    }
  }
}

export function readLeads(): Lead[] {
  try {
    ensureDb();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeLeads(leads: Lead[]): void {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(leads, null, 2), 'utf-8');
}

export function getLeadById(id: string): Lead | null {
  return readLeads().find((l) => l.id === id) ?? null;
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const leads = readLeads();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, id };
  writeLeads(leads);
  return leads[idx];
}
