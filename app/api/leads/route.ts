import { NextRequest, NextResponse } from 'next/server';
import { readLeads, writeLeads } from '@/lib/leads-db';
import { Lead } from '@/lib/types';

export async function GET() {
  return NextResponse.json(readLeads());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leads = readLeads();
  const lead: Lead = {
    ...body,
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    called: false,
    notes: body.notes ?? '',
  };
  leads.push(lead);
  writeLeads(leads);
  return NextResponse.json(lead, { status: 201 });
}
