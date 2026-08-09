'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LEAD_CATEGORIES,
  LEAD_STATUSES,
  STATUS_LABELS,
  type Lead,
  type LeadCategory,
  type LeadStatus,
} from '@/lib/types';
import CategoryTabs from '@/components/CategoryTabs';
import LeadRow from '@/components/LeadRow';

const DAY_MS = 24 * 60 * 60 * 1000;

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<LeadCategory | 'all'>('all');
  const [status, setStatus] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  // Captured once (not re-evaluated on every render) so "new since
  // yesterday" stays stable across re-renders instead of drifting live.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
      });
  }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(LEAD_CATEGORIES.map((cat) => [cat, 0])) as Record<LeadCategory, number>;
    for (const l of leads) c[l.category]++;
    return c;
  }, [leads]);

  const newSinceYesterday = useMemo(
    () => leads.filter((l) => now - new Date(l.firstSeen).getTime() < DAY_MS).length,
    [leads, now]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((l) => {
      if (category !== 'all' && l.category !== category) return false;
      if (status !== 'all' && l.status !== status) return false;
      if (q) {
        const hay = `${l.name} ${l.location ?? ''} ${l.description ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, category, status, search]);

  function handleUpdated(updated: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-white tracking-tight">
            Lead Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} Leads insgesamt
            {newSinceYesterday > 0 && (
              <span className="text-[#c9a84c]"> · {newSinceYesterday} neu seit gestern</span>
            )}
          </p>
        </div>
        <Link
          href="/api/leads/export"
          className="text-xs text-gray-500 hover:text-[#c9a84c] transition-colors underline underline-offset-2"
        >
          CSV exportieren
        </Link>
      </div>

      <CategoryTabs active={category} counts={counts} total={leads.length} onChange={setCategory} />

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche nach Firma, Ort, Beschreibung …"
          className="flex-1 min-w-[240px] bg-[#111111] border border-[#1e1e1e] rounded-lg px-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | 'all')}
          className="bg-[#111111] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a84c] transition-colors"
        >
          <option value="all">Alle Status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-gray-600 text-sm py-12 text-center">Keine Leads gefunden.</p>
        ) : (
          filtered.map((lead) => <LeadRow key={lead.id} lead={lead} now={now} onUpdated={handleUpdated} />)
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-56 bg-[#1a1a1a] rounded" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 bg-[#111111] border border-[#1e1e1e] rounded-lg" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
