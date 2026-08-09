import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, getStatusHistory, updateLeadNotes, updateLeadStatus } from '@/lib/db';
import { LEAD_STATUSES } from '@/lib/types';

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/leads/[id]'>) {
  const { id } = await ctx.params;
  const lead = getLeadById(id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const history = getStatusHistory(id);
  return NextResponse.json({ ...lead, history });
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/leads/[id]'>) {
  const { id } = await ctx.params;
  const existing = getLeadById(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  let lead = existing;

  if (typeof body.status === 'string') {
    if (!LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const updated = updateLeadStatus(id, body.status, 'dashboard');
    if (updated) lead = updated;
  }

  if (typeof body.notes === 'string') {
    const updated = updateLeadNotes(id, body.notes);
    if (updated) lead = updated;
  }

  return NextResponse.json(lead);
}
