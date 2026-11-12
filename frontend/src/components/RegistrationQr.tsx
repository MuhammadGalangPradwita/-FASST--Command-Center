'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, MessageSquare, QrCode, Share2 } from 'lucide-react';

import { getRegistrationUrl } from '@/components/RegistrationLink';

interface RegistrationQrProps {
  token: string;
  mcNama: string;
}

const BRAND = '#0d5c4d';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mc';
}

/**
 * Gambar poster PNG siap cetak/bagikan: judul, nama MC, QR, dan link.
 */
async function renderPoster(url: string, mcNama: string): Promise<HTMLCanvasElement> {
  const width = 1080;
  const height = 1350;
  const qrSize = 760;

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: BRAND, light: '#ffffff' },
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak didukung browser ini.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Pita atas
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, width, 220);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Daftar Jadi Anggota', width / 2, 115);
  ctx.font = '36px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Scan QR ini dengan kamera HP Anda', width / 2, 175);

  ctx.drawImage(qrCanvas, (width - qrSize) / 2, 280, qrSize, qrSize);

  ctx.fillStyle = '#64748b';
  ctx.font = '32px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText('Koordinator (MC)', width / 2, 1120);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillText(mcNama, width / 2, 1185, width - 120);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '26px ui-monospace, Consolas, monospace';
  ctx.fillText(url, width / 2, 1265, width - 80);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar.'))), 'image/png');
  });
}

/**
 * Kartu QR code link pendaftaran MC: pratinjau, unduh poster PNG, salin, dan bagikan.
 */
export default function RegistrationQr({ token, mcNama }: RegistrationQrProps) {
  const [url] = useState(() => getRegistrationUrl(token));
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  // Hanya dirender di browser (di dalam AuthGuard), jadi navigator aman diakses di sini.
  const [canShareFile] = useState(() => {
    try {
      const probe = new File([''], 'probe.png', { type: 'image/png' });
      return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
    } catch {
      return false;
    }
  });

  const fileName = `qr-pendaftaran-${slugify(mcNama)}.png`;
  const shareText = `Halo! Silakan daftar sebagai anggota tim melalui link berikut: ${url}`;

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(url, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: BRAND, light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await canvasToBlob(await renderPoster(url, mcNama));
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleShareImage = async () => {
    setBusy(true);
    try {
      const blob = await canvasToBlob(await renderPoster(url, mcNama));
      const file = new File([blob], fileName, { type: 'image/png' });
      await navigator.share({ files: [file], text: shareText });
    } catch (err) {
      // Pengguna menutup dialog bagikan: bukan error
      if ((err as Error)?.name !== 'AbortError') console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const buttonBase =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Pratinjau QR */}
        <div className="mx-auto w-full max-w-[220px] shrink-0 sm:mx-0 sm:w-44">
          <div className="aspect-square rounded-2xl border border-emerald-100 bg-white p-3 shadow-2xs">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL hasil generate di browser
              <img src={qrDataUrl} alt={`QR code pendaftaran ${mcNama}`} className="h-full w-full" />
            ) : (
              <div className="h-full w-full animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <QrCode className="h-4 w-4 text-[#0d5c4d]" />
              QR Code &amp; Link Pendaftaran
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Minta calon anggota scan QR ini atau buka link-nya. Yang mendaftar otomatis masuk ke kelompok Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="group flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition hover:border-[#0d5c4d]/40"
            title="Ketuk untuk menyalin"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{url}</span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
                copied ? 'text-emerald-700' : 'text-slate-500 group-hover:text-[#0d5c4d]'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Tersalin' : 'Salin'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={busy || !qrDataUrl}
              className={`${buttonBase} bg-[#0d5c4d] text-white hover:bg-[#09483c]`}
            >
              <Download className="h-4 w-4" />
              Unduh QR
            </button>

            {canShareFile ? (
              <button
                type="button"
                onClick={() => void handleShareImage()}
                disabled={busy || !qrDataUrl}
                className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Share2 className="h-4 w-4" />
                Bagikan QR
              </button>
            ) : (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <MessageSquare className="h-4 w-4" />
                Kirim via WA
              </a>
            )}

            {canShareFile && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className={`${buttonBase} col-span-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:col-span-1`}
              >
                <MessageSquare className="h-4 w-4" />
                Kirim Link via WA
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
