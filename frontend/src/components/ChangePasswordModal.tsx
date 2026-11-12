'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound, Eye, EyeOff, X, AlertCircle, RefreshCw } from 'lucide-react';

import { api } from '@/lib/api';

interface ChangePasswordModalProps {
  /** Wajib ganti (setelah login dengan kata sandi sementara): modal tidak bisa ditutup. */
  forced?: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  /** Ditampilkan pada mode wajib agar pengguna tidak terjebak (mis. salah akun). */
  onLogout?: () => void;
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-11 text-sm outline-none focus:border-[#0d5c4d] focus:bg-white"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

export default function ChangePasswordModal({ forced = false, onClose, onSuccess, onLogout }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setSaving(true);

    try {
      await api.changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Gagal mengganti kata sandi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (!forced && !saving && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-[#0d5c4d]">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {forced ? 'Buat Kata Sandi Baru' : 'Ganti Kata Sandi'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {forced
                  ? 'Anda masuk dengan kata sandi sementara. Buat kata sandi baru untuk melanjutkan.'
                  : 'Setelah diganti, sesi di perangkat lain akan otomatis keluar.'}
              </p>
            </div>
          </div>

          {!forced && (
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="current-password"
            label={forced ? 'Kata Sandi Sementara' : 'Kata Sandi Lama'}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordInput
            id="new-password"
            label="Kata Sandi Baru"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            hint="Minimal 8 karakter dan berbeda dari kata sandi lama."
          />
          <PasswordInput
            id="confirm-password"
            label="Ulangi Kata Sandi Baru"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            {forced && onLogout && (
              <button
                type="button"
                disabled={saving}
                onClick={onLogout}
                className="mr-auto rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-red-600"
              >
                Keluar
              </button>
            )}
            {!forced && (
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={saving || password.length < 8}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:opacity-50"
            >
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
