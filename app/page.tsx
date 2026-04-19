'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Contact } from '@/lib/types';
import {
  calculateContactRevenue,
  calculatePipelineStats,
  formatCurrency,
  getFollowUpStatus,
} from '@/lib/pricing';
import StatusBadge from '@/components/StatusBadge';

const STATUS_ORDER = [
  'Offen',
  'Kontaktiert',
  'Gespräch geführt',
  'Angebot gesendet',
  'Abgeschlossen',
  'Abgelehnt',
] as const;

const STATUS_COLORS: Record<string, string> = {
  Offen: '#6b7280',
  Kontaktiert: '#60a5fa',
  'Gespräch geführt': '#fbbf24',
  'Angebot gesendet': '#fb923c',
  Abgeschlossen: '#34d399',
  Abgelehnt: '#f87171',
};

export default function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <Skeleton />;

  const stats = calculatePipelineStats(contacts);

  const followUpsDue = contacts.filter((c) => {
    const s = getFollowUpStatus(c.followUpDate);
    return s === 'today' || s === 'overdue';
  });

  const statusCounts = STATUS_ORDER.map((s) => ({
    status: s,
    count: contacts.filter((c) => c.status === s).length,
  }));
  const maxCount = Math.max(...statusCounts.map((s) => s.count), 1);

  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Ihre B2B Sales Pipeline auf einen Blick</p>
        </div>
        <a
          href="/api/contacts/export"
          className="text-xs text-gray-500 hover:text-[#C9A84C] transition-colors underline underline-offset-2"
        >
          CSV exportieren
        </a>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Kontakte gesamt"
          value={String(contacts.length)}
          sub={`${contacts.filter((c) => c.status !== 'Abgelehnt').length} aktiv`}
          icon="👥"
        />
        <KpiCard
          label="Bestätigter Umsatz"
          value={formatCurrency(stats.confirmedRevenue)}
          sub="Abgeschlossene Deals"
          accent="green"
          icon="✅"
        />
        <KpiCard
          label="Pipeline-Wert"
          value={formatCurrency(stats.pipelineValue)}
          sub="Potenzielle Deals"
          accent="gold"
          icon="📈"
        />
        <KpiCard
          label="Follow-ups fällig"
          value={String(followUpsDue.length)}
          sub={followUpsDue.length > 0 ? 'Heute & überfällig' : 'Alles im grünen Bereich'}
          accent={followUpsDue.length > 0 ? 'red' : undefined}
          icon="🔔"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Status Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1e1e1e] rounded-xl p-6">
          <h2 className="text-white font-semibold mb-5">Pipeline nach Status</h2>
          <div className="space-y-3.5">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-38 shrink-0 min-w-[148px]">{status}</span>
                <div className="flex-1 h-5 bg-[#0f0f0f] rounded-full overflow-hidden border border-[#1e1e1e]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: count > 0 ? `${Math.max((count / maxCount) * 100, 8)}%` : '0%',
                      backgroundColor: STATUS_COLORS[status],
                      opacity: count === 0 ? 0 : 1,
                    }}
                  />
                </div>
                <span className="text-white text-sm font-semibold w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-up Alerts */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <h2 className="text-white font-semibold">Follow-ups fällig</h2>
            {followUpsDue.length > 0 && (
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full font-medium">
                {followUpsDue.length}
              </span>
            )}
          </div>
          {followUpsDue.length === 0 ? (
            <p className="text-gray-600 text-sm">Keine Follow-ups fällig. 🎉</p>
          ) : (
            <div className="space-y-2">
              {followUpsDue.slice(0, 6).map((c) => {
                const s = getFollowUpStatus(c.followUpDate);
                return (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="block p-3 bg-[#161616] rounded-lg hover:bg-[#1c1c1c] transition-colors border border-[#1e1e1e] hover:border-[#2a2a2a]"
                  >
                    <div className="text-white text-sm font-medium truncate">{c.company}</div>
                    <div className="text-gray-500 text-xs mt-0.5 truncate">{c.contactPerson}</div>
                    <div
                      className={`text-xs mt-1.5 font-medium ${
                        s === 'overdue' ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {s === 'overdue' ? `Überfällig seit ${formatDate(c.followUpDate)}` : 'Heute fällig'}
                    </div>
                  </Link>
                );
              })}
              {followUpsDue.length > 6 && (
                <Link href="/contacts" className="text-[#C9A84C] text-xs hover:underline block pt-1">
                  +{followUpsDue.length - 6} weitere →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Contacts */}
      <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Zuletzt aktualisiert</h2>
          <Link href="/contacts" className="text-[#C9A84C] text-sm hover:underline">
            Alle anzeigen →
          </Link>
        </div>
        <div className="divide-y divide-[#1a1a1a]">
          {recentContacts.map((c) => (
            <Link
              key={c.id}
              href={`/contacts/${c.id}`}
              className="flex items-center justify-between py-3.5 hover:bg-[#161616] -mx-2 px-2 rounded transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <div className="text-white text-sm font-medium group-hover:text-[#C9A84C] transition-colors truncate">
                  {c.company}
                </div>
                <div className="text-gray-600 text-xs mt-0.5">
                  {c.contactPerson} · {c.city}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <StatusBadge status={c.status} />
                <span className="text-gray-700 text-xs hidden sm:block">
                  {formatCurrency(calculateContactRevenue(c))}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: 'gold' | 'green' | 'red';
  icon: string;
}) {
  const valueClass =
    accent === 'gold'
      ? 'text-[#C9A84C]'
      : accent === 'green'
      ? 'text-emerald-400'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-white';

  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-xs uppercase tracking-widest leading-snug">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueClass} leading-none`}>{value}</p>
      <p className="text-gray-600 text-xs mt-1.5">{sub}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-[#1a1a1a] rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
        <div className="h-64 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
