'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(searchParams.get('next') || '/');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Anmeldung fehlgeschlagen');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-[#111111] border border-[#1e1e1e] rounded-xl p-8"
      >
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-[#c9a84c] mb-1">
          Reonobilis
        </h1>
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-8">Lead Engine</p>

        <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">
          Passwort
        </label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#c9a84c] transition-colors"
        />

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-[#c9a84c] text-black font-medium rounded-lg py-2.5 hover:bg-[#dab85f] transition-colors disabled:opacity-50"
        >
          {loading ? 'Anmelden …' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
