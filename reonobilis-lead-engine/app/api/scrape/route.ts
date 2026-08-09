import { NextRequest, NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scrapers';

// Public route by design (excluded from the session-cookie check in proxy.ts)
// so the GitHub Actions cron job / local script can call it without a
// browser session — but it still requires its own bearer secret.
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summaries = await runAllScrapers();
  return NextResponse.json({ summaries });
}
