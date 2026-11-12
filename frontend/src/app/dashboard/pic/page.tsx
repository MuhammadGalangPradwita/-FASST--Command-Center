'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Users,
  UserCheck,
  Target,
  Search,
  RefreshCw,
  Eye,
  KeyRound,
  MapPin,
  AlertCircle,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';

import { api, getStoredAuth } from '@/lib/api';
import AuthGuard from '@/components/auth/AuthGuard';
import PageHeader from '@/components/PageHeader';
import RegistrationLink from '@/components/RegistrationLink';
import McMembersModal from '@/components/McMembersModal';
import ResetPasswordDialog, { ResetRequestBadge } from '@/components/ResetPasswordDialog';
import WaGroupLinkCard from '@/components/WaGroupLinkCard';

type PicMc = {
  id: number;
  nama: string;
  no_hp: string;
  link_token: string;
  quota_count: number;
  password_reset_requested_at?: string | null;
};

type PicDashboard = {
  pic: {
    id: number;
    nama: string;
    wilayah: string;
    no_hp: string;
    wa_group_link: string | null;
  };
  summary: {
    total_mcs: number;
    total_registered: number;
    avg_per_mc: number;
  };
  mcs: PicMc[];
};

type McForm = {
  nama: string;
  no_hp: string;
};

const initialMcForm: McForm = { nama: '', no_hp: '' };

export default function PicDashboardPage() {
  return (
    <AuthGuard allowedRoles={['pic']}>
      <PicDashboardContent />
    </AuthGuard>
  );
}

function PicDashboardContent() {
  // AuthGuard hanya merender konten ini di browser setelah sesi PIC terbaca.
  const [picId] = useState(() => Number(getStoredAuth()?.user?.id));

  const [data, setData] = useState<PicDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [memberMc, setMemberMc] = useState<PicMc | null>(null);
  const [resettingMc, setResettingMc] = useState<PicMc | null>(null);

  const [showAddMc, setShowAddMc] = useState(false);
  const [mcForm, setMcForm] = useState<McForm>(initialMcForm);
  const [savingMc, setSavingMc] = useState(false);
  const [mcFormError, setMcFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const res = (await api.getPicDashboard(picId)) as {
          success?: boolean;
          message?: string;
          data?: PicDashboard;
        };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal memuat dashboard PIC.');
          return;
        }

        setError('');
        setData(res.data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error && err.message ? err.message : 'Gagal memuat dashboard PIC.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [picId, reloadKey]);

  const openAddMc = () => {
    setMcForm(initialMcForm);
    setMcFormError('');
    setShowAddMc(true);
  };

  const handleAddMc = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingMc(true);
    setMcFormError('');

    try {
      const res = (await api.createMc(picId, {
        nama: mcForm.nama.trim(),
        no_hp: mcForm.no_hp.trim(),
      })) as { success?: boolean; message?: string; data?: { nama?: string } };

      if (res.success === false) {
        setMcFormError(res.message ?? 'MC gagal ditambahkan.');
        return;
      }

      setShowAddMc(false);
      setSuccessMsg(
        `MC ${res.data?.nama ?? mcForm.nama.trim()} berhasil ditambahkan. Password awal untuk login: password123`,
      );
      setRefreshing(true);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setMcFormError(
        err instanceof Error && err.message ? err.message : 'Gagal menambahkan MC.',
      );
    } finally {
      setSavingMc(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
        Memuat dashboard PIC...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || 'Data PIC tidak ditemukan.'}</span>
        </div>
      </div>
    );
  }

  const { pic, summary, mcs } = data;

  const filteredMcs = mcs.filter((mc) => {
    const query = search.trim().toLowerCase();
    return [mc.nama, mc.no_hp].some((value) => value?.toLowerCase().includes(query));
  });

  const stats = [
    { label: 'MC Dikelola', value: summary.total_mcs, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    {
      label: 'Anggota Terdaftar',
      value: summary.total_registered,
      icon: UserCheck,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Rata-rata per MC',
      value: summary.avg_per_mc,
      icon: Target,
      tone: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title={`Halo, ${pic.nama}`}
        subtitle="Pantau seluruh MC di wilayah Anda beserta anggotanya."
      />
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {successMsg}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100"
            aria-label="Tutup pesan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <WaGroupLinkCard
        picId={pic.id}
        link={pic.wa_group_link}
        onSaved={(link) =>
          setData((prev) => (prev ? { ...prev, pic: { ...prev.pic, wa_group_link: link } } : prev))
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className={`rounded-xl p-3 ${stat.tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daftar MC</h3>
            <p className="mt-1 text-xs text-slate-500">
              Menampilkan {filteredMcs.length} dari {mcs.length} MC yang Anda kelola.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama MC atau nomor WA..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#0d5c4d]"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                setReloadKey((k) => k + 1);
              }}
              disabled={refreshing}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={openAddMc}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#09483c] active:scale-[0.98] sm:flex-none"
            >
              <Plus className="h-4 w-4" />
              Tambah MC
            </button>
          </div>
        </div>

        {mcs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            Belum ada MC di wilayah Anda. Klik &quot;Tambah MC&quot; untuk mendaftarkan MC pertama.
          </div>
        ) : filteredMcs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Tidak ditemukan MC yang sesuai dengan pencarian.
          </div>
        ) : (
          <>
          {/* Kartu MC untuk layar kecil */}
          <ul className="space-y-3 md:hidden">
            {filteredMcs.map((mc) => (
              <li key={mc.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {mc.nama}
                      <ResetRequestBadge requestedAt={mc.password_reset_requested_at} />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">{mc.no_hp || '-'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {mc.quota_count} anggota
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">Link pendaftaran</span>
                  <RegistrationLink token={mc.link_token} mcNama={mc.nama} compact />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberMc(mc)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 active:bg-emerald-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Lihat Anggota
                  </button>
                  <button
                    type="button"
                    onClick={() => setResettingMc(mc)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 active:bg-amber-50"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset Password
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-3 pl-2 font-medium">No.</th>
                  <th className="pb-3 font-medium">Nama MC</th>
                  <th className="pb-3 font-medium">No. WhatsApp</th>
                  <th className="pb-3 font-medium">Link Pendaftaran</th>
                  <th className="pb-3 font-medium">Jumlah Anggota</th>
                  <th className="pb-3 pr-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredMcs.map((mc, index) => (
                  <tr key={mc.id} className="transition hover:bg-slate-50/80">
                    <td className="py-4 pl-2 text-slate-500">{index + 1}</td>
                    <td className="py-4 font-semibold text-slate-800">
                      {mc.nama}
                      <ResetRequestBadge requestedAt={mc.password_reset_requested_at} />
                    </td>
                    <td className="py-4 text-slate-600">{mc.no_hp || '-'}</td>
                    <td className="py-4">
                      <RegistrationLink token={mc.link_token} mcNama={mc.nama} compact />
                    </td>
                    <td className="py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {mc.quota_count} anggota
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setResettingMc(mc)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                        aria-label={`Reset password ${mc.nama}`}
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberMc(mc)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0d5c4d]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat Anggota
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {resettingMc && (
        <ResetPasswordDialog
          targetName={resettingMc.nama}
          targetRole="MC"
          onReset={async () => {
            const res = (await api.resetMcPasswordByPic(picId, resettingMc.id)) as {
              data?: { temporary_password?: string };
            };
            return res.data?.temporary_password ?? '';
          }}
          onDone={() => setReloadKey((k) => k + 1)}
          onClose={() => setResettingMc(null)}
        />
      )}

      {memberMc && (
        <McMembersModal
          mcId={memberMc.id}
          mcNama={memberMc.nama}
          onClose={() => setMemberMc(null)}
        />
      )}

      {showAddMc && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingMc) setShowAddMc(false);
          }}
        >
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tambah MC</h2>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  MC akan terdaftar di wilayah {pic.wilayah}.
                </p>
              </div>
              <button
                type="button"
                disabled={savingMc}
                onClick={() => setShowAddMc(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMc} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nama MC
                </label>
                <input
                  required
                  maxLength={100}
                  value={mcForm.nama}
                  onChange={(e) => setMcForm({ ...mcForm, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  maxLength={20}
                  value={mcForm.no_hp}
                  onChange={(e) => setMcForm({ ...mcForm, no_hp: e.target.value })}
                  placeholder="081234567890"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Dipakai MC untuk login ke sistem.
                </span>
              </div>

              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Link pendaftaran anggota yang unik dibuat otomatis untuk MC ini.
                Password awal untuk login: <span className="font-mono font-semibold">password123</span>
              </p>

              {mcFormError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{mcFormError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={savingMc}
                  onClick={() => setShowAddMc(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingMc}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:opacity-50"
                >
                  {savingMc && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {savingMc ? 'Menyimpan...' : 'Simpan MC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
