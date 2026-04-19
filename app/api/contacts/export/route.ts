import { NextResponse } from 'next/server';
import { readContacts } from '@/lib/db';
import { calculateContactRevenue } from '@/lib/pricing';

export async function GET() {
  const contacts = readContacts();

  const headers = [
    'ID',
    'Firma',
    'Ansprechpartner',
    'Typ',
    'Telefon',
    'E-Mail',
    'Stadt/Region',
    'Tier',
    'Status',
    'Notizen',
    'Letzter Kontakt',
    'Follow-up Datum',
    'Umsatz (EUR)',
    'Erstellt',
    'Aktualisiert',
  ];

  const escape = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = contacts.map((c) => [
    escape(c.id),
    escape(c.company),
    escape(c.contactPerson),
    escape(c.type),
    escape(c.phone),
    escape(c.email),
    escape(c.city),
    escape(c.tier),
    escape(c.status),
    escape(c.notes),
    escape(c.lastContactDate),
    escape(c.followUpDate),
    escape(calculateContactRevenue(c)),
    escape(c.createdAt),
    escape(c.updatedAt),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reos-crm-contacts.csv"',
    },
  });
}
