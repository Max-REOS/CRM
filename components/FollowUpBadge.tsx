'use client';

import { getFollowUpStatus } from '@/lib/pricing';

export default function FollowUpBadge({ date }: { date: string }) {
  if (!date) return null;
  const status = getFollowUpStatus(date);
  if (!status || status === 'upcoming') return null;

  if (status === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/25">
        &#9888; Überfällig
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/25">
      &#128276; Heute fällig
    </span>
  );
}
