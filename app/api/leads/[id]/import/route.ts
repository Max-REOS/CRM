import { NextRequest, NextResponse } from 'next/server';
import { getLeadById, updateLead } from '@/lib/leads-db';
import { createContact } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const lead = getLeadById(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const contact = createContact({
    company: lead.company,
    contactPerson: lead.contactPerson,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    type: lead.type,
    tier: 'Bronze',
    status: 'Offen',
    notes: `Importiert aus Lead Finder.\nSegment: ${lead.segment}\nWebsite: ${lead.website}`,
    lastContactDate: '',
    followUpDate: '',
  });

  updateLead(params.id, { called: true });

  return NextResponse.json({ contact, success: true });
}
