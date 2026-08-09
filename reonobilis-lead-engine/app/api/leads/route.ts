import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/db';
import type { LeadCategory, LeadStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') as LeadCategory | null;
  const status = searchParams.get('status') as LeadStatus | null;
  const search = searchParams.get('q')?.toLowerCase().trim() ?? '';

  let leads = getAllLeads();

  if (category) leads = leads.filter((l) => l.category === category);
  if (status) leads = leads.filter((l) => l.status === status);
  if (search) {
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(search) ||
        (l.location ?? '').toLowerCase().includes(search) ||
        (l.description ?? '').toLowerCase().includes(search)
    );
  }

  return NextResponse.json(leads);
}
