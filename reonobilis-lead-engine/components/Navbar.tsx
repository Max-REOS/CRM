'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-[#1e1e1e] bg-[#0a0a0a] sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-[family-name:var(--font-cormorant)] text-2xl font-semibold text-[#c9a84c] tracking-wide">
            Reonobilis
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Lead Engine
          </span>
        </Link>
        <button
          onClick={logout}
          className="text-xs uppercase tracking-widest text-gray-500 hover:text-[#c9a84c] transition-colors"
        >
          Abmelden
        </button>
      </div>
    </header>
  );
}
