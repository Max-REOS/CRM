'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Contact } from '@/lib/types';
import {
  calculateContactRevenue,
  formatCurrency,
  getFollowUpStatus,
  getMonthlyPrice,
  ACTIVATION_FEE,
} from '@/lib/pricing';
import StatusBadge from '@/components/StatusBadge';
import TierBadge from '@/components/TierBadge';
import FollowUpBadge from '@/components/FollowUpBadge';

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setContact(data);
        setLoading(false);
      })
      .catch(() => {
        router.push('/contacts');
      });
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm(`Kontakt "${contact?.company}" wirklich löschen?`)) return;
    setDeleting(true);
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    router.push('/contacts');
    router.refresh();
  };

  if (loading) return <Skeleton />;
  if (!contact) return null;

  const revenue = calculateContactRevenue(contact);
  const monthly = getMonthlyPrice(contact.type, contact.tier);
  const followUpStatus = getFollowUpStatus(contact.followUpDate);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/contacts" className="hover:text-[#C9A84C] transition-colors">
          Kontakte
        </Link>
        <span>/</span>
        <span className="text-gray-400">{contact.company}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{contact.company}</h1>
            <StatusBadge status={contact.status} />
            <TierBadge tier={contact.tier} />
            {contact.followUpDate && <FollowUpBadge date={contact.followUpDate} />}
          </div>
          <p className="text-gray-500 text-sm">{contact.contactPerson}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/contacts/${id}/edit`}
            className="px-4 py-2 bg-[#1a1a1a] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#222] transition-colors border border-[#2a2a2a]"
          >
            ✏ Bearbeiten
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/25 disabled:opacity-50"
          >
            {deleting ? 'Löschen…' : '✕ Löschen'}
          </button>
        </div>
      </div>

      {/* Follow-up Alert Banner */}
      {(followUpStatus === 'overdue' || followUpStatus === 'today') && (
        <div
          className={`px-4 py-3 rounded-lg border text-sm font-medium ${
            followUpStatus === 'overdue'
              ? 'bg-red-500/10 border-red-500/25 text-red-400'
              : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
          }`}
        >
          {followUpStatus === 'overdue'
            ? `⚠ Follow-up ist überfällig seit ${formatDate(contact.followUpDate)}. Bitte jetzt kontaktieren.`
            : `🔔 Follow-up ist heute fällig (${formatDate(contact.followUpDate)}).`}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact Details */}
          <InfoCard title="Kontaktinformationen">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Firma" value={contact.company} />
              <InfoRow label="Ansprechpartner" value={contact.contactPerson} />
              <InfoRow
                label="Telefon"
                value={
                  contact.phone ? (
                    <a href={`tel:${contact.phone}`} className="text-[#C9A84C] hover:underline">
                      {contact.phone}
                    </a>
                  ) : (
                    '–'
                  )
                }
              />
              <InfoRow
                label="E-Mail"
                value={
                  contact.email ? (
                    <a href={`mailto:${contact.email}`} className="text-[#C9A84C] hover:underline">
                      {contact.email}
                    </a>
                  ) : (
                    '–'
                  )
                }
              />
              <InfoRow label="Stadt / Region" value={contact.city || '–'} />
              <InfoRow label="Typ" value={contact.type} />
            </div>
          </InfoCard>

          {/* Activity */}
          <InfoCard title="Aktivität">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow
                label="Letzter Kontakt"
                value={contact.lastContactDate ? formatDate(contact.lastContactDate) : '–'}
              />
              <InfoRow
                label="Follow-up Datum"
                value={
                  contact.followUpDate ? (
                    <span
                      className={
                        followUpStatus === 'overdue'
                          ? 'text-red-400'
                          : followUpStatus === 'today'
                          ? 'text-amber-400'
                          : 'text-white'
                      }
                    >
                      {formatDate(contact.followUpDate)}
                    </span>
                  ) : (
                    '–'
                  )
                }
              />
              <InfoRow
                label="Erstellt am"
                value={formatDate(contact.createdAt.slice(0, 10))}
              />
              <InfoRow
                label="Zuletzt aktualisiert"
                value={formatDate(contact.updatedAt.slice(0, 10))}
              />
            </div>
          </InfoCard>

          {/* Notes */}
          {contact.notes && (
            <InfoCard title="Notizen">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {contact.notes}
              </p>
            </InfoCard>
          )}
        </div>

        {/* Sidebar: Revenue */}
        <div className="space-y-5">
          <div className="bg-[#111111] border border-[#C9A84C]/20 rounded-xl p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-4">
              Umsatz-Berechnung
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monatspreis</span>
                <span className="text-white font-medium">{formatCurrency(monthly)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">× 3 Monate (Quartal)</span>
                <span className="text-white font-medium">{formatCurrency(monthly * 3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">+ Aktivierungsgebühr</span>
                <span className="text-white font-medium">{formatCurrency(ACTIVATION_FEE)}</span>
              </div>
              <div className="border-t border-[#2a2a2a] pt-3 flex justify-between">
                <span className="text-gray-400 font-medium">Gesamt (quarterly)</span>
                <span className="text-[#C9A84C] text-xl font-bold">{formatCurrency(revenue)}</span>
              </div>
            </div>

            {contact.status === 'Abgeschlossen' && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2 text-emerald-400 text-xs font-medium text-center">
                ✓ Bestätigter Umsatz
              </div>
            )}
            {contact.status === 'Abgelehnt' && (
              <div className="mt-4 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 text-red-400 text-xs font-medium text-center">
                ✕ Nicht realisiert
              </div>
            )}
            {contact.status !== 'Abgeschlossen' && contact.status !== 'Abgelehnt' && (
              <div className="mt-4 bg-[#C9A84C]/10 border border-[#C9A84C]/20 rounded-lg px-3 py-2 text-[#C9A84C] text-xs font-medium text-center">
                ◎ Potenzielle Pipeline
              </div>
            )}
          </div>

          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
              Kategorisierung
            </h3>
            <InfoRow label="Typ" value={contact.type} />
            <InfoRow
              label="Tier"
              value={<TierBadge tier={contact.tier} />}
            />
            <InfoRow
              label="Status"
              value={<StatusBadge status={contact.status} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C] mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-gray-600 text-xs mb-0.5">{label}</p>
      <div className="text-white text-sm">{value}</div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 max-w-4xl animate-pulse">
      <div className="h-4 w-32 bg-[#1a1a1a] rounded" />
      <div className="h-8 w-64 bg-[#1a1a1a] rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
          <div className="h-32 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
        </div>
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
