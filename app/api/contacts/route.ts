import { NextRequest, NextResponse } from 'next/server';
import { readContacts, createContact } from '@/lib/db';

export async function GET() {
  const contacts = readContacts();
  return NextResponse.json(contacts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const contact = createContact(body);
  return NextResponse.json(contact, { status: 201 });
}
