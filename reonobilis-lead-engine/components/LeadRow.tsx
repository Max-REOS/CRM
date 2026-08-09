'use client';

import { useState } from 'react';
import { CATEGORY_LABELS, LEAD_STATUSES, STATUS_LABELS, type Lead, type LeadStatus } from '@/lib/types';
import StatusBadge from './StatusBadge';

const DAY_MS = 24 * 60 * 60 * 1000;

function isNewSinceYesterday(firstSeen: string, now: number): boolean {
  return now - new Date(firstSeen).getTime() < DAY_MS;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function LeadRow({
  lead,
  now,
  onUpdated,
}: {
  lead: Lead;
  now: number;
  onUpdated: (lead: Lead) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(lead.notes);
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      onUpdated(updated);
    }
  }

  return (
    <div className="border border-[#1e1e1e] rounded-xl bg-[#111111] overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#161616] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{lead.name}</span>
            {isNewSinceYesterday(lead.firstSeen, now) && (
              <span className="text-[10px] uppercase tracking-widest font-medium px-2 py-0.5 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] border border-[#c9a84c]/30">
                Neu seit gestern
              </span>
            )}
          </div>
          <div className="text-gray-600 text-xs mt-1 truncate">
            {CATEGORY_LABELS[lead.category]}
            {lead.location ? ` · ${lead.location}` : ''}
            {lead.sourceName ? ` · Quelle: ${lead.sourceName}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={lead.status} />
          <span className="text-gray-700 text-xs font-mono">{formatDate(lead.firstSeen)}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#1e1e1e] px-5 py-4 space-y-4">
          {lead.description && <p className="text-gray-400 text-sm leading-relaxed">{lead.description}</p>}

          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {lead.registerId && <span>Register: {lead.registerId}</span>}
            {lead.signalDate && <span>Signal-Datum: {formatDate(lead.signalDate)}</span>}
            {lead.sourceUrl && (
              <a
                href={lead.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#c9a84c] hover:underline"
              >
                Quelle öffnen →
              </a>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Status-Pipeline</p>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={saving || s === lead.status}
                  onClick={() => patch({ status: s })}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                    s === lead.status
                      ? 'bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#c9a84c]'
                      : 'bg-[#0a0a0a] border-[#1e1e1e] text-gray-400 hover:border-[#2a2a2a]'
                  }`}
                >
                  {STATUS_LABELS[s as LeadStatus]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Notizen</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== lead.notes && patch({ notes })}
              rows={2}
              className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a84c] transition-colors resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
