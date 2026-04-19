'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e1e] bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
              <span className="text-black font-bold text-sm">R</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-wide">
              REOS{' '}
              <span className="text-[#C9A84C]">CRM</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <NavLink href="/" active={pathname === '/'}>
              Dashboard
            </NavLink>
            <NavLink
              href="/contacts"
              active={pathname.startsWith('/contacts') && pathname !== '/contacts/new'}
            >
              Kontakte
            </NavLink>
            <Link
              href="/contacts/new"
              className="ml-3 px-4 py-1.5 bg-[#C9A84C] text-black text-sm font-semibold rounded hover:bg-[#D4B86A] transition-colors"
            >
              + Neuer Kontakt
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm rounded transition-colors ${
        active
          ? 'text-[#C9A84C] bg-[#C9A84C]/10'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}
