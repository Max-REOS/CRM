'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ContactType } from '@/lib/types';

const BUNDESLÄNDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

const SEGMENTS_BY_TYPE: Record<ContactType, string[]> = {
  Baufinanzierer: [
    'Unabhängiger Finanzierungsvermittler',
    'Finanzierungsmakler',
    'Baufinanzierungsberater',
  ],
  Immobilienmakler: [
    'Luxusimmobilien',
    'Premium Wohnimmobilien',
    'Premiumimmobilien',
    'Premium Gewerbeimmobilien',
  ],
};

const EMPTY = {
  company: '',
  contactPerson: '',
  phone: '',
  email: '',
  website: '',
  city: '',
  bundesland: 'Bayern',
  type: 'Baufinanzierer' as ContactType,
  segment: 'Unabhängiger Finanzierungsvermittler',
};

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-reset segment when type changes
      if (name === 'type') {
        next.segment = SEGMENTS_BY_TYPE[value as ContactType][0];
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      router.push('/leads');
      router.refresh();
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.');
      setLoading(false);
    }
  };

  const segments = SEGMENTS_BY_TYPE[form.type];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/leads" className="hover:text-[#C9A84C] transition-colors">
          Lead Finder
        </Link>
        <span>/</span>
        <span className="text-gray-400">Neuer Lead</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Neuer Lead</h1>
        <p className="text-gray-500 text-sm mt-1">Lead zur Kaltakquise-Datenbank hinzufügen</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company info */}
        <Section title="Unternehmen">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Field
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="www.beispiel.de"
            />
          </div>
        </Section>

        {/* Location */}
        <Section title="Standort">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Stadt *" name="city" value={form.city} onChange={handleChange} required />
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Bundesland *</label>
              <select
                name="bundesland"
                value={form.bundesland}
                onChange={handleChange}
                required
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 cursor-pointer appearance-none transition-colors"
              >
                {BUNDESLÄNDER.map((bl) => (
                  <option key={bl} value={bl}>
                    {bl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Categorization */}
        <Section title="Kategorisierung">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Typ *</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                required
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 cursor-pointer appearance-none transition-colors"
              >
                <option value="Baufinanzierer">Baufinanzierer</option>
                <option value="Immobilienmakler">Immobilienmakler</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Segment *</label>
              <select
                name="segment"
                value={form.segment}
                onChange={handleChange}
                required
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 cursor-pointer appearance-none transition-colors"
              >
                {segments.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#C9A84C] text-black font-semibold rounded-lg hover:bg-[#D4B86A] transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? 'Speichern…' : 'Lead hinzufügen'}
          </button>
          <Link
            href="/leads"
            className="px-6 py-2.5 bg-[#1a1a1a] text-gray-300 font-medium rounded-lg hover:bg-[#222] transition-colors border border-[#2a2a2a] text-sm"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5 space-y-4">
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
  placeholder = '',
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/60 placeholder-gray-700 transition-colors"
      />
    </div>
  );
}
