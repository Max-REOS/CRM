'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Contact, ContactStatus, ContactType, TierInterest } from '@/lib/types';
import {
  calculateContactRevenue,
  formatCurrency,
  getFollowUpStatus,
} from '@/lib/pricing';
import StatusBadge from '@/components/StatusBadge';
import TierBadge from '@/components/TierBadge';
import FollowUpBadge from '@/components/FollowUpBadge';

type SortField = 'company' | 'lastContactDate' | 'followUpDate' | 'createdAt' | 'revenue';
type SortDir = 'asc' | 'desc';

const ALL = 'Alle';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);
  const [filterTier, setFilterTier] = useState(ALL);
  const [sortField, setSortField] = useState<SortField>('updatedAt' as SortField);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((data) => {
        setContacts(data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let result = [...contacts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }

    if (filterType !== ALL) result = result.filter((c) => c.type === filterType);
    if (filterStatus !== ALL) result = result.filter((c) => c.status === filterStatus);
    if (filterTier !== ALL) result = result.filter((c) => c.tier === filterTier);

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'revenue') {
        aVal = calculateContactRevenue(a);
        bVal = calculateContactRevenue(b);
      } else if (sortField === 'company') {
        aVal = a.company.toLowerCase();
        bVal = b.company.toLowerCase();
      } else {
        aVal = (a as unknown as Record<string, string>)[sortField] ?? '';
        bVal = (b as unknown as Record<string, string>)[sortField] ?? '';
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [contacts, search, filterType, filterStatus, filterTier, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const followUpDueCount = contacts.filter((c) => {
    const s = getFollowUpStatus(c.followUpDate);
    return s === 'today' || s === 'overdue';
  }).length;

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      <span className="ml-1 text-[#C9A84C]">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : (
      <span className="ml-1 text-gray-700">↕</span>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Kontakte</h1>
          <p className="text-gray-500 text-sm mt-1">
            {contacts.length} Kontakte gesamt
            {followUpDueCount > 0 && (
              <span className="ml-2 text-red-400">
                · {followUpDueCount} Follow-up{followUpDueCount > 1 ? 's' : ''} fällig
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/contacts/export"
            className="px-4 py-2 bg-[#1a1a1a] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#222] transition-colors border border-[#2a2a2a]"
          >
            ↓ CSV Export
          </a>
          <Link
            href="/contacts/new"
            className="px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors"
          >
            + Neuer Kontakt
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Suche nach Firma, Name, Stadt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 placeholder-gray-700 transition-colors"
          />
        </div>

        <FilterSelect
          value={filterType}
          onChange={setFilterType}
          options={[ALL, 'Baufinanzierer', 'Immobilienmakler']}
          label="Typ"
        />
        <FilterSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            ALL,
            'Offen',
            'Kontaktiert',
            'Gespräch geführt',
            'Angebot gesendet',
            'Abgeschlossen',
            'Abgelehnt',
          ]}
          label="Status"
        />
        <FilterSelect
          value={filterTier}
          onChange={setFilterTier}
          options={[ALL, 'Bronze', 'Silver', 'Gold', 'Enterprise']}
          label="Tier"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#111111] border border-[#1e1e1e] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">Keine Kontakte gefunden.</p>
          {(search || filterType !== ALL || filterStatus !== ALL || filterTier !== ALL) && (
            <button
              onClick={() => {
                setSearch('');
                setFilterType(ALL);
                setFilterStatus(ALL);
                setFilterTier(ALL);
              }}
              className="mt-3 text-[#C9A84C] text-sm hover:underline"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#1e1e1e]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0f0f0f] border-b border-[#1e1e1e]">
                <Th onClick={() => toggleSort('company')}>
                  Firma <SortIcon field="company" />
                </Th>
                <Th>Typ</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Stadt</Th>
                <Th className="hidden lg:table-cell" onClick={() => toggleSort('lastContactDate')}>
                  Letzter Kontakt <SortIcon field="lastContactDate" />
                </Th>
                <Th className="hidden lg:table-cell" onClick={() => toggleSort('followUpDate')}>
                  Follow-up <SortIcon field="followUpDate" />
                </Th>
                <Th className="hidden sm:table-cell" onClick={() => toggleSort('revenue')}>
                  Umsatz <SortIcon field="revenue" />
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]">
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="bg-[#111111] hover:bg-[#161616] transition-colors cursor-pointer group"
                  onClick={() => (window.location.href = `/contacts/${c.id}`)}
                >
                  <td className="px-4 py-3.5">
                    <div className="text-white text-sm font-medium group-hover:text-[#C9A84C] transition-colors">
                      {c.company}
                    </div>
                    <div className="text-gray-600 text-xs mt-0.5">{c.contactPerson}</div>
                    <div className="mt-1">
                      <FollowUpBadge date={c.followUpDate} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-gray-400 text-xs">{c.type === 'Baufinanzierer' ? 'Baufi.' : 'Makler'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <TierBadge tier={c.tier} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-gray-400 text-sm">{c.city || '–'}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-gray-500 text-sm">
                      {c.lastContactDate ? formatDate(c.lastContactDate) : '–'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    {c.followUpDate ? (
                      <span
                        className={`text-sm ${
                          getFollowUpStatus(c.followUpDate) === 'overdue'
                            ? 'text-red-400'
                            : getFollowUpStatus(c.followUpDate) === 'today'
                            ? 'text-amber-400'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatDate(c.followUpDate)}
                      </span>
                    ) : (
                      <span className="text-gray-700 text-sm">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell">
                    <span className="text-[#C9A84C] text-sm font-medium">
                      {formatCurrency(calculateContactRevenue(c))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 bg-[#0f0f0f] border-t border-[#1e1e1e] text-gray-600 text-xs">
            {filtered.length} von {contacts.length} Kontakten
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
        onClick ? 'cursor-pointer hover:text-gray-300 select-none' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </th>
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
            {opt === 'Alle' ? `${label}: Alle` : opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
        ▾
      </span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
