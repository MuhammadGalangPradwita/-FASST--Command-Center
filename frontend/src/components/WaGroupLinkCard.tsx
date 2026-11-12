'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Pencil,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { api } from '@/lib/api';

// Sama dengan Pic::WA_GROUP_PATTERN di backend (https:// boleh tidak ditulis)
const WA_GROUP_PATTERN =
  /^(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/(invite\/)?[A-Za-z0-9]{10,64}(\?\S*)?$/i;

interface WaGroupLinkCardProps {
  picId: number;
  link: string | null;
  /** Dipanggil setelah link tersimpan, dengan nilai terbaru dari server. */
  onSaved?: (link: string | null) => void;
}

/**
 * Kartu pengaturan link grup WhatsApp PIC. Anggota yang mendaftar lewat link MC
 * mana pun di bawah PIC ini diarahkan ke grup tersebut setelah submit form.
 */
export default function WaGroupLinkCard({ picId, link, onSaved }: WaGroupLinkCardProps) {
  const [currentLink, setCurrentLink] = useState(link);
  const [editing, setEditing] = useState(!link);
  const [value, setValue] = useState(link ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const trimmed = value.trim();
  const looksValid = trimmed === '' || WA_GROUP_PATTERN.test(trimmed);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!looksValid) return;

    setSaving(true);
    setError('');
    setSavedMsg('');

    try {
      const res = (await api.updatePicWaGroup(picId, trimmed || null)) as {
        success?: boolean;
        message?: string;
        data?: { wa_group_link: string | null };
      };

      const saved = res.data?.wa_group_link ?? null;
      setCurrentLink(saved);
      setValue(saved ?? '');
      setEditing(!saved);
      setSavedMsg(res.message ?? 'Link grup WhatsApp tersimpan.');
      onSaved?.(saved);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Gagal menyimpan link grup.');
    } finally {
      setSaving(false);
    }
  };

  const ready = Boolean(currentLink);

  return (
    <div
      className={`rounded-2xl border p-5 ${
        ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/70'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 rounded-xl p-2.5 ${
            ready ? 'bg-emerald-100 text-[#0d5c4d]' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <MessageCircle className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">Grup WhatsApp Wilayah</h3>
          <p className="mt-0.5 text-xs text-slate-600">
            {ready
              ? 'Aktif. Semua anggota yang daftar lewat link MC Anda otomatis diarahkan ke grup ini.'
              : 'Belum diisi. Anggota yang mendaftar belum bisa diarahkan ke grup WhatsApp.'}
          </p>
        </div>
      </div>

      {savedMsg && (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
          {savedMsg}
        </p>
      )}

      {!editing && currentLink ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <a
            href={currentLink}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate rounded-xl border border-emerald-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-700 hover:border-[#0d5c4d]"
            title="Buka grup untuk memastikan link benar"
          >
            {currentLink}
          </a>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <a
              href={currentLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Tes Link
            </a>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setSavedMsg('');
              }}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0d5c4d] px-3 text-xs font-semibold text-white hover:bg-[#09483c]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Ubah
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              aria-label="Link undangan grup WhatsApp"
              aria-invalid={!looksValid}
              className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 py-2.5 font-mono text-xs text-slate-800 outline-none focus:border-[#0d5c4d] ${
                looksValid ? 'border-slate-200' : 'border-red-300'
              }`}
            />
            <div className="flex gap-2">
              {currentLink && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setValue(currentLink);
                    setEditing(false);
                    setError('');
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !looksValid || (!currentLink && trimmed === '')}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0d5c4d] px-4 text-xs font-semibold text-white hover:bg-[#09483c] disabled:opacity-50 sm:flex-none"
              >
                {saving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {saving ? 'Menyimpan...' : currentLink && trimmed === '' ? 'Hapus Link' : 'Simpan'}
              </button>
            </div>
          </div>

          {!looksValid ? (
            <p className="flex items-start gap-1.5 text-[11px] text-red-600">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              Harus link undangan grup, contoh: https://chat.whatsapp.com/AbC123xyz
            </p>
          ) : (
            <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
              {!currentLink && <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />}
              Cara ambil link: buka grup WA → ketuk nama grup → Undang via link → Salin link.
            </p>
          )}

          {error && (
            <p className="flex items-start gap-1.5 text-xs text-red-600">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
