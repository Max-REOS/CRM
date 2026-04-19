import { TierInterest } from '@/lib/types';

const TIER_CONFIG: Record<TierInterest, { color: string; bg: string }> = {
  Bronze: { color: '#cd7f32', bg: '#cd7f3218' },
  Silver: { color: '#c0c8d8', bg: '#c0c8d818' },
  Gold: { color: '#C9A84C', bg: '#C9A84C18' },
  Enterprise: { color: '#a78bfa', bg: '#a78bfa18' },
};

export default function TierBadge({ tier }: { tier: TierInterest }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
    >
      {tier}
    </span>
  );
}
