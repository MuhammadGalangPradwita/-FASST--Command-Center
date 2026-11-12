'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';

type LinkInfo = {
  mc_nama: string;
  wilayah: string;
  member_count: number;
  has_wa_group: boolean;
};

type SuccessData = {
  mc: {
    nama: string;
    member_count: number;
  };
  /** Link grup WA milik PIC; null bila PIC belum mengisinya. */
  whatsapp_group_link: string | null;
};

const MASUKAN_MAX = 1000;
const REDIRECT_SECONDS = 3;
const CURRENT_YEAR = new Date().getFullYear();

const inputClass =
  'w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0d5c4d]';

function getErrorMessage(err: unknown): string {
  const error = err as { message?: string; data?: { message?: string } };
  return error?.data?.message || error?.message || 'Terjadi kesalahan. Silakan coba lagi.';
}

function RegistrationForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [errorMsg, setErrorMsg] = useState<string | null>(token ? null : 'Tautan pendaftaran tidak valid.');

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    no_hp: '',
    jurusan: '',
    angkatan: '',
    domisili: '',
    pekerjaan: '',
    masukan: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  const waGroupLink = successData?.whatsapp_group_link ?? null;

  // Setelah daftar berhasil, arahkan otomatis ke grup WhatsApp PIC
  useEffect(() => {
    if (!waGroupLink) return;

    if (countdown <= 0) {
      window.location.href = waGroupLink;
      return;
    }

    const timer = window.setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [waGroupLink, countdown]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    api.checkRegistrationLink(token)
      .then((response) => {
        const res = response as { success?: boolean; data?: LinkInfo };
        if (!cancelled && res.success && res.data) {
          setLinkInfo(res.data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setErrorMsg(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        link_token: token,
        nama: formData.nama,
        nik: formData.nik,
        no_hp: formData.no_hp,
        jurusan: formData.jurusan.trim(),
        angkatan: Number(formData.angkatan),
        domisili: formData.domisili.trim() || null,
        pekerjaan: formData.pekerjaan.trim() || null,
        masukan: formData.masukan.trim() || null,
      };

      const res = (await api.registerMember(payload)) as {
        success?: boolean;
        data?: SuccessData;
      };
      if (res.success && res.data) {
        setSuccessData(res.data);
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = formData.nik.length === 16 && formData.angkatan.length === 4 && !submitting;

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-[#0d5c4d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memeriksa link pendaftaran...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Pendaftaran Anggota</h1>
        <p className="text-xs text-slate-500">
          Isi data diri Anda untuk bergabung bersama koordinator (MC) di bawah ini. Cuma butuh ±1 menit.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* MC Info Box */}
      {linkInfo && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Koordinator Lapangan (MC) Anda:
            </span>
            <h3 className="font-bold text-sm text-slate-900 mt-0.5">{linkInfo.mc_nama}</h3>
          </div>

          <div className="sm:text-right">
            <span className="text-[10px] text-slate-400 block">Sudah Bergabung:</span>
            <span className="inline-block whitespace-nowrap text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0d5c4d] border border-emerald-200">
              {linkInfo.member_count} Anggota
            </span>
          </div>
        </div>
      )}

      {/* If Success: Pop-up CTA for WhatsApp Group Redirect (PRD 3.1 & 3.2 #3) */}
      {successData && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xs">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-[#0d5c4d] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Pendaftaran Berhasil!</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              Data Anda telah tercatat dalam kelompok MC <strong>{successData.mc.nama}</strong>. Terima kasih atas dukungan dan masukannya!
            </p>
          </div>

          {waGroupLink ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0d5c4d]">
                <MessageSquare className="w-4 h-4" />
                Langkah terakhir: gabung grup WhatsApp
              </div>
              <p className="text-[11px] text-slate-600" aria-live="polite">
                {countdown > 0
                  ? `Anda akan diarahkan ke grup WhatsApp wilayah dalam ${countdown} detik...`
                  : 'Membuka WhatsApp... Jika tidak terbuka otomatis, ketuk tombol di bawah.'}
              </p>
              <a
                href={waGroupLink}
                className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#0d5c4d] hover:bg-[#09473b] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Gabung Grup WhatsApp Sekarang</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <MessageSquare className="w-4 h-4" />
                Grup WhatsApp wilayah segera menyusul
              </div>
              <p className="mt-1 text-[11px] text-slate-600">
                Koordinator Anda akan mengirimkan link grup WhatsApp ke nomor yang Anda daftarkan.
              </p>
            </div>
          )}

        </div>
      )}

      {/* Main Registration Form */}
      {linkInfo && !successData && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Data Diri</h3>
            <p className="text-xs text-slate-500">Pastikan NIK dan Nomor WhatsApp aktif dan sesuai KTP.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              placeholder="Misal: Siti Nurhaliza"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIK (16 Digit Angka) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={16}
                pattern="[0-9]{16}"
                placeholder="3171012301900099"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                className={`${inputClass} font-mono`}
              />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{formData.nik.length}/16 digit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                autoComplete="tel"
                placeholder="081234567899"
                value={formData.no_hp}
                onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                className={`${inputClass} font-mono`}
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Dipakai koordinator untuk menghubungi Anda</span>
            </div>
          </div>

          {/* Data Alumni */}
          <div className="pt-3 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Data Alumni</h3>
            <p className="text-xs text-slate-500">Jurusan dan angkatan wajib, sisanya boleh dikosongkan.</p>
          </div>

          <div className="grid grid-cols-[1fr_7rem] gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jurusan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="Misal: Teknik Informatika"
                value={formData.jurusan}
                onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Angkatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={4}
                pattern="(19[5-9][0-9]|20[0-9]{2})"
                title={`Tahun masuk, misal 2015 (1950–${CURRENT_YEAR})`}
                placeholder="2015"
                value={formData.angkatan}
                onChange={(e) => setFormData({ ...formData, angkatan: e.target.value.replace(/\D/g, '') })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Domisili (Kota) <span className="text-slate-400 font-normal">· opsional</span>
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="Misal: Bandung"
                value={formData.domisili}
                onChange={(e) => setFormData({ ...formData, domisili: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pekerjaan / Instansi <span className="text-slate-400 font-normal">· opsional</span>
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="Misal: Wiraswasta, PNS, Mahasiswa"
                value={formData.pekerjaan}
                onChange={(e) => setFormData({ ...formData, pekerjaan: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Kritik & Masukan */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kritik & Masukan untuk Mas Anto <span className="text-slate-400 font-normal">· opsional</span>
            </label>
            <textarea
              rows={3}
              maxLength={MASUKAN_MAX}
              placeholder="Apa harapan, kritik, atau usulan Anda untuk Mas Anto?"
              value={formData.masukan}
              onChange={(e) => setFormData({ ...formData, masukan: e.target.value })}
              className={`${inputClass} resize-y`}
            />
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block text-right">
              {formData.masukan.length}/{MASUKAN_MAX}
            </span>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                canSubmit
                  ? 'bg-[#0d5c4d] hover:bg-[#09473b] text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Memproses Pendaftaran...' : 'Daftar Sebagai Pendukung'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0d5c4d]" />
              Kerahasiaan data terjamin
            </span>
            {linkInfo.has_wa_group && (
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#0d5c4d]" />
                Setelah daftar, langsung masuk grup WhatsApp
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400 text-xs">Memuat formulir pendaftaran...</div>}>
      <RegistrationForm />
    </Suspense>
  );
}
