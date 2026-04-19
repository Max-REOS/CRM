import { NextRequest, NextResponse } from 'next/server';
import { updateLead } from '@/lib/leads-db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const lead = updateLead(params.id, body);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(lead);
}
