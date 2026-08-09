import { NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/db';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/types';

function csvEscape(value: string | null): string {
  const v = value ?? '';
  if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export async function GET() {
  const leads = getAllLeads();
  const header = [
    'Name',
    'Kategorie',
    'Ort',
    'Register-ID',
    'Status',
    'Signal-Datum',
    'Quelle',
    'Quell-URL',
    'Beschreibung',
    'Notizen',
    'Zuerst gesehen',
  ];

  const rows = leads.map((l) =>
    [
      l.name,
      CATEGORY_LABELS[l.category],
      l.location ?? '',
      l.registerId ?? '',
      STATUS_LABELS[l.status],
      l.signalDate ?? '',
      l.sourceName ?? '',
      l.sourceUrl ?? '',
      l.description ?? '',
      l.notes,
      l.firstSeen,
    ]
      .map(csvEscape)
      .join(';')
  );

  const csv = [header.join(';'), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reonobilis-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
