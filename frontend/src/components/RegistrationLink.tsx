'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, QrCode, RefreshCw } from 'lucide-react';

export function getRegistrationPath(token: string): string {
  return `/daftar/${token}`;
}

export function getRegistrationUrl(token: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${getRegistrationPath(token)}`;
}

interface RegistrationLinkProps {
  token?: string | null;
  /** Nama MC untuk poster QR & nama file unduhan */
  mcNama?: string;
  compact?: boolean;
}

/**
 * Link pendaftaran anggota milik satu MC, dengan tombol salin, unduh QR & buka.
 */
export default function RegistrationLink({ token, mcNama = 'MC', compact = false }: RegistrationLinkProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!token) {
    return <span className="text-slate-400">-</span>;
  }

  const path = getRegistrationPath(token);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getRegistrationUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadQr = async () => {
    setDownloading(true);
    try {
      // Library QR baru dimuat saat dibutuhkan agar halaman tabel tetap ringan
      const { downloadQrPoster } = await import('@/components/RegistrationQr');
      await downloadQrPoster(token, mcNama);
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {!compact && (
        <span className="max-w-[180px] truncate font-mono text-xs text-slate-500" title={path}>
          {path}
        </span>
      )}

      <button
        type="button"
        onClick={() => void handleCopy()}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
          copied
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
        title="Salin link pendaftaran"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Tersalin' : 'Salin'}
      </button>

      <button
        type="button"
        onClick={() => void handleDownloadQr()}
        disabled={downloading}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        title={`Unduh QR pendaftaran ${mcNama} (PNG)`}
      >
        {downloading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
        QR
      </button>

      <a
        href={path}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        title="Buka halaman pendaftaran"
        aria-label="Buka halaman pendaftaran"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
