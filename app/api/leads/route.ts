import { NextResponse } from 'next/server';
import { readLeads } from '@/lib/leads-db';

export async function GET() {
  return NextResponse.json(readLeads());
}
