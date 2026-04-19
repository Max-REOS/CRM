'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Contact } from '@/lib/types';
import ContactForm from '@/components/ContactForm';

export default function EditContactPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#1a1a1a] rounded" />
        <div className="h-96 bg-[#111111] border border-[#1e1e1e] rounded-xl" />
      </div>
    );
  }

  if (!contact) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/contacts" className="hover:text-[#C9A84C] transition-colors">
            Kontakte
          </Link>
          <span>/</span>
          <Link href={`/contacts/${id}`} className="hover:text-[#C9A84C] transition-colors">
            {contact.company}
          </Link>
          <span>/</span>
          <span className="text-gray-400">Bearbeiten</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Kontakt bearbeiten</h1>
        <p className="text-gray-500 text-sm mt-1">{contact.company}</p>
      </div>
      <ContactForm contact={contact} />
    </div>
  );
}
