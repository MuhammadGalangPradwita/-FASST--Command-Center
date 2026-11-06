'use client';

import { useState } from 'react';
import { KeyRound, Copy, Check, AlertCircle, RefreshCw, X } from 'lucide-react';

interface ResetPasswordDialogProps {
  /** Nama akun yang direset, mis. "Dewi Sartika". */
  targetName: string;
  /** "PIC" atau "MC". */
  targetRole: string;
  /** Memanggil API reset dan mengembalikan kata sandi sementara. */
  onReset: () => Promise<string>;
  onClose: () => void;
  /** Dipanggil setelah reset berhasil (mis. untuk memuat ulang daftar). */
  onDone?: () => void;
}

/**
 * Dialog reset kata sandi oleh atasan: konfirmasi, lalu tampilkan kata sandi sementara sekali saja.
 */
export default function ResetPasswordDialog({
  targetName,
  targetRole,
  onReset,
  onClose,
  onDone,
}: ResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temporary, setTemporary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    setError('');

    try {
      setTemporary(await onReset());
      onDone?.();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Gagal mereset kata sandi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!temporary) return;
    try {
      await navigator.clipboard.writeText(temporary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {temporary ? 'Kata Sandi Sementara' : 'Reset Kata Sandi?'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {targetRole} <span className="font-semibold">{targetName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {temporary ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="font-mono text-lg font-bold tracking-wider text-emerald-900">{temporary}</span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  copied ? 'border-emerald-300 bg-white text-emerald-700' : 'border-emerald-200 bg-white text-slate-700 hover:bg-emerald-100'
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
              <li>Kirim kata sandi ini ke {targetName} lewat WhatsApp.</li>
              <li>Kata sandi hanya ditampilkan sekarang, simpan sebelum menutup.</li>
              <li>{targetName} wajib membuat kata sandi baru saat login berikutnya.</li>
            </ul>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c]"
              >
                Selesai
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Kata sandi lama akan diganti dengan kata sandi sementara, dan semua sesi login akun ini
              akan dikeluarkan.
            </p>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleReset()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                {loading ? 'Mereset...' : 'Reset Kata Sandi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Penanda kecil bahwa akun meminta reset kata sandi lewat halaman "Lupa kata sandi". */
export function ResetRequestBadge({ requestedAt }: { requestedAt?: string | null }) {
  if (!requestedAt) return null;

  return (
    <span
      className="ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-amber-700"
      title={`Diminta ${new Date(requestedAt).toLocaleString('id-ID')}`}
    >
      <KeyRound className="h-3 w-3" />
      Minta reset password
    </span>
  );
}
