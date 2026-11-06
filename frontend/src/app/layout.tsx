import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import AppLayout from '@/components/AppLayout';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sistem Pemenangan',
  description:
    'Pendataan pendukung berjenjang: Jenderal, PIC wilayah, MC koordinator (maks. 10 anggota/MC), dan pendaftaran anggota lewat link unik MC.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="h-full bg-[#f4f5f7] text-slate-900 antialiased overflow-hidden">
        {/* AppLayout membaca URL (usePathname), wajib di dalam Suspense karena cacheComponents aktif */}
        <Suspense>
          <AppLayout>{children}</AppLayout>
        </Suspense>
      </body>
    </html>
  );
}
