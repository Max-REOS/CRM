'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Contact, ContactType, TierInterest, ContactStatus } from '@/lib/types';
import { calculateContactRevenue, formatCurrency, getMonthlyPrice } from '@/lib/pricing';

interface ContactFormProps {
  contact?: Contact;
}

const DEFAULT_FORM = {
  company: '',
  contactPerson: '',
  type: 'Baufinanzierer' as ContactType,
  phone: '',
  email: '',
  city: '',
  tier: 'Bronze' as TierInterest,
  status: 'Offen' as ContactStatus,
  notes: '',
  lastContactDate: '',
  followUpDate: '',
};

export default function ContactForm({ contact }: ContactFormProps) {
  const router = useRouter();
  const isEdit = !!contact;

  const [form, setForm] = useState({
    company: contact?.company ?? '',
    contactPerson: contact?.contactPerson ?? '',
    type: contact?.type ?? ('Baufinanzierer' as ContactType),
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    city: contact?.city ?? '',
    tier: contact?.tier ?? ('Bronze' as TierInterest),
    status: contact?.status ?? ('Offen' as ContactStatus),
    notes: contact?.notes ?? '',
    lastContactDate: contact?.lastContactDate ?? '',
    followUpDate: contact?.followUpDate ?? '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit ? `/api/contacts/${contact!.id}` : '/api/contacts';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');

      const saved = await res.json();
      router.push(`/contacts/${saved.id}`);
      router.refresh();
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.');
      setLoading(false);
    }
  };

  const previewRevenue =
    form.type && form.tier
      ? calculateContactRevenue({ ...DEFAULT_FORM, ...form } as Contact)
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Contact Info */}
      <Section title="Kontaktinformationen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Firma *" name="company" value={form.company} onChange={handleChange} required />
          <Field
            label="Ansprechpartner *"
            name="contactPerson"
            value={form.contactPerson}
            onChange={handleChange}
            required
          />
          <Field label="Telefon" name="phone" value={form.phone} onChange={handleChange} type="tel" />
          <Field label="E-Mail" name="email" value={form.email} onChange={handleChange} type="email" />
          <Field label="Stadt / Region" name="city" value={form.city} onChange={handleChange} />
        </div>
      </Section>

      {/* Categorization */}
      <Section title="Kategorisierung">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Typ *"
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            options={['Baufinanzierer', 'Immobilienmakler']}
          />
          <SelectField
            label="Tier *"
            name="tier"
            value={form.tier}
            onChange={handleChange}
            required
            options={['Bronze', 'Silver', 'Gold', 'Enterprise']}
          />
          <SelectField
            label="Status *"
            name="status"
            value={form.status}
            onChange={handleChange}
            required
            options={[
              'Offen',
              'Kontaktiert',
              'Gespräch geführt',
              'Angebot gesendet',
              'Abgeschlossen',
              'Abgelehnt',
            ]}
          />
        </div>

        {/* Revenue Preview */}
        {previewRevenue !== null && (
          <div className="mt-4 p-4 bg-[#0a0a0a] border border-[#C9A84C]/20 rounded-lg">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Umsatz-Vorschau</p>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-[#C9A84C] text-2xl font-bold">
                  {formatCurrency(previewRevenue)}
                </span>
                <span className="text-gray-600 text-sm ml-2">quarterly inkl. Aktivierungsgebühr</span>
              </div>
              <div className="text-gray-600 text-sm">
                {formatCurrency(getMonthlyPrice(form.type, form.tier))}/mo × 3 + €3.500
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Activity */}
      <Section title="Aktivität & Notizen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Letzter Kontakt"
            name="lastContactDate"
            value={form.lastContactDate}
            onChange={handleChange}
            type="date"
          />
          <Field
            label="Follow-up Datum"
            name="followUpDate"
            value={form.followUpDate}
            onChange={handleChange}
            type="date"
          />
        </div>
        <div className="mt-4">
          <label className="block text-gray-400 text-sm mb-1.5">Notizen</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 resize-none placeholder-gray-700 transition-colors"
            placeholder="Interne Notizen zu diesem Kontakt..."
          />
        </div>
      </Section>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#C9A84C] text-black font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? 'Speichern…' : isEdit ? 'Änderungen speichern' : 'Kontakt erstellen'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-[#1a1a1a] text-gray-300 font-medium rounded-lg hover:bg-[#222] transition-colors border border-[#2a2a2a] text-sm"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-6 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 placeholder-gray-700 transition-colors"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-gray-400 text-sm mb-1.5">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 cursor-pointer transition-colors appearance-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
