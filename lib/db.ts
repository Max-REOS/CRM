import fs from 'fs';
import path from 'path';
import { Contact } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'contacts.json');

export function readContacts(): Contact[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function writeContacts(contacts: Contact[]): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
