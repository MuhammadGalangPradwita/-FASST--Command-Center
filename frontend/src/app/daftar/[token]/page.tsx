'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
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
  quota_count: number;
  quota_max: number;
  quota_remaining: number;
  is_quota_full: boolean;
};

type SuccessData = {
  mc: {
    nama: string;
    quota_status: string;
  };
  whatsapp_group_link: string;
};

function getErrorMessage(err: unknown): string {
  const error = err as { message?: string; data?: { message?: string } };
  return error?.data?.message || error?.message || 'Terjadi kesalahan. Silakan coba lagi.';
}

function RegistrationForm() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    no_hp: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

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

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-[#0d5c4d] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memeriksa link pendaftaran dan kuota kelompok...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Pendaftaran Anggota</h1>
        <p className="text-xs text-slate-500">
          Isi data diri Anda untuk bergabung bersama koordinator (MC) di bawah ini.
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
            <span className="text-[10px] text-slate-400 block">Sisa Kuota:</span>
            <span className={`inline-block whitespace-nowrap text-xs font-bold px-2.5 py-0.5 rounded-full ${
              linkInfo.is_quota_full 
                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                : 'bg-emerald-50 text-[#0d5c4d] border border-emerald-200'
            }`}>
              {linkInfo.is_quota_full ? 'PENUH (10/10)' : `${linkInfo.quota_remaining} Slot Tersedia`}
            </span>
          </div>
        </div>
      )}

      {/* If Quota is FULL -> Auto Disabled per PRD 3.1 #3 */}
      {linkInfo?.is_quota_full && !successData && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Pendaftaran Ditutup Otomatis</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
              Berdasarkan aturan ketat PRD, sistem membatasi maksimal 10 anggota per MC. Kelompok MC <strong>{linkInfo.mc_nama}</strong> telah mencapai batas maksimal 10 pemilih aktif.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Silakan hubungi koordinator Anda untuk mendapatkan link pendaftaran lain.
          </p>
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
              Data Anda telah terverifikasi dalam struktur komando MC <strong>{successData.mc.nama}</strong> (Kuota: {successData.mc.quota_status}).
            </p>
          </div>

          {/* Interactive CTA to WhatsApp Group */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0d5c4d]">
              <MessageSquare className="w-4 h-4" />
              Grup Koordinasi WhatsApp Resmi Relawan
            </div>
            <p className="text-[11px] text-slate-600">
              Langkah terakhir: Silakan klik tombol di bawah untuk langsung bergabung ke grup koordinasi resmi wilayah Anda!
            </p>
            <a
              href={successData.whatsapp_group_link}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#0d5c4d] hover:bg-[#09473b] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Gabung Grup WhatsApp Koordinasi Sekarang</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}

      {/* Main Registration Form */}
      {linkInfo && !linkInfo.is_quota_full && !successData && (
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
              placeholder="Misal: Siti Nurhaliza"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0d5c4d]"
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
                maxLength={16}
                pattern="[0-9]{16}"
                placeholder="3171012301900099"
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0d5c4d] font-mono"
              />
              <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{formData.nik.length}/16 digit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor WhatsApp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="081234567899"
                value={formData.no_hp}
                onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#0d5c4d] font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Dipakai koordinator untuk menghubungi Anda</span>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={submitting || formData.nik.length !== 16}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                formData.nik.length === 16 && !submitting
                  ? 'bg-[#0d5c4d] hover:bg-[#09473b] text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Memproses Pendaftaran...' : 'Daftar Sebagai Pendukung'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0d5c4d]" />
            <span>Kerahasiaan data terjamin</span>
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
