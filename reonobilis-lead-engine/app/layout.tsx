import type { Metadata } from 'next';
import { Cormorant_Garamond, Share_Tech_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const shareTechMono = Share_Tech_Mono({
  variable: '--font-share-tech-mono',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Reonobilis Lead Engine',
  description: 'Automatisierte B2B-Lead-Sammlung aus öffentlichen deutschen Quellen',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="de"
      className={`${cormorant.variable} ${shareTechMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-share-tech-mono)]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
