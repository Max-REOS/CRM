import fs from 'fs';
import path from 'path';
import { Contact } from './types';

const SOURCE_PATH = path.join(process.cwd(), 'data', 'contacts.json');

// Vercel's filesystem is read-only except /tmp.
// On production, seed /tmp from the committed JSON on first use.
const DB_PATH =
  process.env.NODE_ENV === 'production' ? '/tmp/reos-contacts.json' : SOURCE_PATH;

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

export function readContacts(): Contact[] {
  try {
    ensureDb();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function writeContacts(contacts: Contact[]): void {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(contacts, null, 2), 'utf-8');
}

export function getContactById(id: string): Contact | null {
  return readContacts().find((c) => c.id === id) ?? null;
}

export function createContact(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>
): Contact {
  const contacts = readContacts();
  const contact: Contact = {
    ...data,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  contacts.push(contact);
  writeContacts(contacts);
  return contact;
}

export function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id' | 'createdAt'>>
): Contact | null {
  const contacts = readContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  contacts[idx] = { ...contacts[idx], ...updates, id, updatedAt: new Date().toISOString() };
  writeContacts(contacts);
  return contacts[idx];
}

export function deleteContact(id: string): boolean {
  const contacts = readContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return false;
  contacts.splice(idx, 1);
  writeContacts(contacts);
  return true;
}
