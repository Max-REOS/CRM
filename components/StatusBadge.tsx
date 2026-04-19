import { ContactStatus } from '@/lib/types';

const STATUS_CONFIG: Record<ContactStatus, { color: string; bg: string }> = {
  Offen: { color: '#9ca3af', bg: '#9ca3af18' },
  Kontaktiert: { color: '#60a5fa', bg: '#60a5fa18' },
  'Gespräch geführt': { color: '#fbbf24', bg: '#fbbf2418' },
  'Angebot gesendet': { color: '#fb923c', bg: '#fb923c18' },
  Abgeschlossen: { color: '#34d399', bg: '#34d39918' },
  Abgelehnt: { color: '#f87171', bg: '#f8717118' },
};

export default function StatusBadge({ status }: { status: ContactStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
    >
      {status}
    </span>
  );
}
