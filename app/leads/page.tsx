'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Lead } from '@/lib/types';
import Toast from '@/components/Toast';

const ALL = 'Alle';

type SortField = 'company' | 'city' | 'bundesland';
type SortDir = 'asc' | 'desc';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBL, setFilterBL] = useState(ALL);
  const [filterType, setFilterType] = useState(ALL);
  const [filterCalled, setFilterCalled] = useState(ALL);
  const [sortField] = useState<SortField>('company');
  const [sortDir] = useState<SortDir>('asc');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((data) => {
        setLeads(data);
        setLoading(false);
      });
  }, []);

  const bundesländer = useMemo(
    () => [ALL, ...Array.from(new Set(leads.map((l) => l.bundesland))).sort()],
    [leads]
  );

  const filtered = useMemo(() => {
    let result = [...leads];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.segment.toLowerCase().includes(q)
      );
    }

    if (filterBL !== ALL) result = result.filter((l) => l.bundesland === filterBL);
    if (filterType !== ALL) result = result.filter((l) => l.type === filterType);
    if (filterCalled === 'Ja') result = result.filter((l) => l.called);
    if (filterCalled === 'Nein') result = result.filter((l) => !l.called);

    result.sort((a, b) => {
      const av = a[sortField].toLowerCase();
      const bv = b[sortField].toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, search, filterBL, filterType, filterCalled, sortField, sortDir]);

  const uncalledCount = leads.filter((l) => !l.called).length;

  const toggleCalled = async (lead: Lead) => {
    const updated = { ...lead, called: !lead.called };
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ called: !lead.called }),
    });
  };

  const saveNotes = async (id: string) => {
    const notes = editingNotes[id] ?? '';
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, notes } : l)));
    setExpandedNotes((prev) => ({ ...prev, [id]: false }));
    await fetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  };

  const importLead = async (lead: Lead) => {
    setImporting((prev) => ({ ...prev, [lead.id]: true }));
    const res = await fetch(`/api/leads/${lead.id}/import`, { method: 'POST' });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, called: true } : l)));
      setToast('Lead übernommen ✓');
    }
    setImporting((prev) => ({ ...prev, [lead.id]: false }));
  };

  const toggleNotes = useCallback(
    (lead: Lead) => {
      const isOpen = expandedNotes[lead.id];
      setExpandedNotes((prev) => ({ ...prev, [lead.id]: !isOpen }));
      if (!isOpen) {
        setEditingNotes((prev) => ({ ...prev, [lead.id]: lead.notes ?? '' }));
      }
    },
    [expandedNotes]
  );

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lead Finder</h1>
          <p className="text-gray-500 text-sm mt-1">
            {leads.length} Kaltakquise-Leads
            {uncalledCount > 0 && (
              <span className="ml-2 text-[#C9A84C]">· {uncalledCount} noch nicht angerufen</span>
            )}
          </p>
        </div>
        <Link
          href="/leads/new"
          className="px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors"
        >
          + Neuer Lead
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', value: leads.length, color: 'text-white' },
          {
            label: 'Noch offen',
            value: uncalledCount,
            color: uncalledCount > 0 ? 'text-[#C9A84C]' : 'text-white',
          },
          {
            label: 'Baufinanzierer',
            value: leads.filter((l) => l.type === 'Baufinanzierer').length,
            color: 'text-sky-400',
          },
          {
            label: 'Immobilienmakler',
            value: leads.filter((l) => l.type === 'Immobilienmakler').length,
            color: 'text-violet-400',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[#111111] border border-[#1e1e1e] rounded-xl px-4 py-3"
          >
            <p className="text-gray-600 text-xs uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Suche nach Firma, Name, Stadt, Segment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 placeholder-gray-700 transition-colors"
          />
        </div>
        <FilterSelect value={filterBL} onChange={setFilterBL} options={bundesländer} label="Bundesland" />
        <FilterSelect
          value={filterType}
          onChange={setFilterType}
          options={[ALL, 'Baufinanzierer', 'Immobilienmakler']}
          label="Typ"
        />
        <FilterSelect
          value={filterCalled}
          onChange={setFilterCalled}
          options={[ALL, 'Nein', 'Ja']}
          label="Angerufen"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#111111] border border-[#1e1e1e] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Keine Leads gefunden.</p>
          <button
            onClick={() => {
              setSearch('');
              setFilterBL(ALL);
              setFilterType(ALL);
              setFilterCalled(ALL);
            }}
            className="mt-3 text-[#C9A84C] text-sm hover:underline"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1e1e1e] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0f0f0f] border-b border-[#1e1e1e]">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firma
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Kontakt
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ / Segment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Stadt / BL
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Angerufen
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {filtered.map((lead) => (
                <>
                  <tr
                    key={lead.id}
                    className={`bg-[#111111] hover:bg-[#161616] transition-colors ${
                      lead.called ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Firma */}
                    <td className="px-4 py-3.5">
                      <div className="text-white text-sm font-medium">{lead.company}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.website && (
                          <a
                            href={`https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#C9A84C]/70 hover:text-[#C9A84C] text-xs transition-colors"
                          >
                            ↗ {lead.website}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Kontakt */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="text-gray-300 text-sm">{lead.contactPerson}</div>
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-gray-500 text-xs hover:text-[#C9A84C] transition-colors"
                      >
                        {lead.phone}
                      </a>
                    </td>

                    {/* Typ / Segment */}
                    <td className="px-4 py-3.5">
                      <TypeBadge type={lead.type} />
                      <div className="mt-1">
                        <SegmentBadge segment={lead.segment} type={lead.type} />
                      </div>
                    </td>

                    {/* Stadt / BL */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="text-gray-300 text-sm">{lead.city}</div>
                      <div className="text-gray-600 text-xs">{lead.bundesland}</div>
                    </td>

                    {/* Called toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleCalled(lead)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          lead.called
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25'
                            : 'bg-[#1e1e1e] text-gray-500 border border-[#2a2a2a] hover:border-[#C9A84C]/40 hover:text-gray-300'
                        }`}
                      >
                        {lead.called ? '✓ Ja' : '— Nein'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleNotes(lead)}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                            expandedNotes[lead.id]
                              ? 'bg-[#C9A84C]/15 border-[#C9A84C]/30 text-[#C9A84C]'
                              : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-[#3a3a3a]'
                          }`}
                          title="Notizen"
                        >
                          📝{lead.notes ? ' ●' : ''}
                        </button>
                        <button
                          onClick={() => importLead(lead)}
                          disabled={importing[lead.id]}
                          className="px-3 py-1.5 bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-medium rounded-lg hover:bg-[#C9A84C]/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {importing[lead.id] ? '…' : '→ In CRM'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Notes expansion row */}
                  {expandedNotes[lead.id] && (
                    <tr key={`${lead.id}-notes`} className="bg-[#0d0d0d]">
                      <td colSpan={6} className="px-4 py-3 border-t border-[#1e1e1e]">
                        <div className="flex gap-3 items-start">
                          <textarea
                            value={editingNotes[lead.id] ?? lead.notes ?? ''}
                            onChange={(e) =>
                              setEditingNotes((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            rows={3}
                            className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 resize-none placeholder-gray-700"
                            placeholder="Notizen zu diesem Lead…"
                          />
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => saveNotes(lead.id)}
                              className="px-4 py-2 bg-[#C9A84C] text-black text-xs font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() =>
                                setExpandedNotes((prev) => ({ ...prev, [lead.id]: false }))
                              }
                              className="px-4 py-2 bg-[#1a1a1a] text-gray-400 text-xs rounded-lg hover:bg-[#222] transition-colors border border-[#2a2a2a]"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-t border-[#1e1e1e] text-gray-600 text-xs">
            {filtered.length} von {leads.length} Leads
          </div>
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isBaufi = type === 'Baufinanzierer';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isBaufi
          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
          : 'bg-violet-500/15 text-violet-400 border border-violet-500/20'
      }`}
    >
      {isBaufi ? 'Baufinanzierer' : 'Immobilienmakler'}
    </span>
  );
}

function SegmentBadge({ segment, type }: { segment: string; type: string }) {
  const isBaufi = type === 'Baufinanzierer';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
        isBaufi
          ? 'bg-sky-500/8 text-sky-500/80'
          : 'bg-[#C9A84C]/8 text-[#C9A84C]/80'
      }`}
    >
      {segment}
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#C9A84C]/60 cursor-pointer appearance-none pr-8 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === ALL ? `${label}: Alle` : opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
        ▾
      </span>
    </div>
  );
}
