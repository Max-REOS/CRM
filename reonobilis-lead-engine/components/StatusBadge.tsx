import { STATUS_LABELS, type LeadStatus } from '@/lib/types';

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  contacted: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  negotiating: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  closed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  lost: 'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-widest font-medium px-2 py-1 rounded-full border ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
