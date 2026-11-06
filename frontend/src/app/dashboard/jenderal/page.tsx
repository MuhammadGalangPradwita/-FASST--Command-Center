'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  Layers,
  Target,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Link2,
  UserPlus,
  History,
} from 'lucide-react';

import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/auth/AuthGuard';

type Kpi = {
  total_pics: number;
  total_mcs: number;
  total_anggota: number;
  target_capacity: number;
  capacity_filled_pct: number;
  via_link: number;
  by_mc: number;
  mcs_full: number;
  mcs_empty: number;
  pics_without_mc: number;
};

type Region = {
  pic_id: number;
  pic_nama: string;
  wilayah: string;
  total_mc: number;
  total_anggota: number;
  capacity: number;
  filled_pct: number;
};

type TopMc = {
  id: number;
  nama: string;
  wilayah: string | null;
  anggota: number;
  quota_max: number;
};

type RecentMember = {
  id: number;
  nama: string;
  mc_nama: string | null;
  wilayah: string | null;
  created_by: 'self' | 'mc';
  created_at: string;
};

type LogEntry = {
  id: number;
  user_type: string;
  action: string;
  description: string | null;
  created_at: string;
};

type DashboardData = {
  kpi: Kpi;
  regional_distribution: Region[];
  top_mcs: TopMc[];
  recent_members: RecentMember[];
  recent_logs: LogEntry[];
  last_updated: string;
};

type PicForm = {
  nama: string;
  no_hp: string;
  wilayah: string;
  password: string;
};

const initialPicForm: PicForm = { nama: '', no_hp: '', wilayah: '', password: '' };

const ROLE_STYLES: Record<string, string> = {
  jenderal: 'bg-purple-50 text-purple-700',
  pic: 'bg-blue-50 text-blue-700',
  mc: 'bg-emerald-50 text-[#0d5c4d]',
  anggota: 'bg-amber-50 text-amber-700',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function JenderalDashboardPage() {
  return (
    <AuthGuard allowedRoles={['jenderal']}>
      <JenderalDashboard />
    </AuthGuard>
  );
}

function JenderalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showAddPicModal, setShowAddPicModal] = useState(false);
  const [picForm, setPicForm] = useState<PicForm>(initialPicForm);
  const [submitting, setSubmitting] = useState(false);
  const [picFormError, setPicFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const res = (await api.getJenderalDashboard()) as {
          success?: boolean;
          message?: string;
          data?: DashboardData;
        };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal memuat dashboard.');
          return;
        }

        setError('');
        setData(res.data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(getErrorMessage(err, 'Gagal memuat dashboard.'));
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
  }, [reloadKey]);

  // Muat ulang otomatis setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => setReloadKey((k) => k + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const reload = () => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const openAddPic = () => {
    setPicForm(initialPicForm);
    setPicFormError('');
    setShowAddPicModal(true);
  };

  const handleCreatePic = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setPicFormError('');

    try {
      await api.createPic({
        nama: picForm.nama.trim(),
        no_hp: picForm.no_hp.trim(),
        wilayah: picForm.wilayah.trim(),
        password: picForm.password,
      });

      setShowAddPicModal(false);
      setSuccessMsg(`PIC ${picForm.nama.trim()} berhasil ditambahkan untuk wilayah ${picForm.wilayah.trim()}.`);
      reload();
    } catch (err) {
      setPicFormError(getErrorMessage(err, 'Gagal menambahkan PIC.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
        Memuat dashboard...
      </div>
    );
  }

  const kpi = data?.kpi;
  const regions = (data?.regional_distribution ?? []).filter((region) => {
    const query = search.trim().toLowerCase();
    return `${region.wilayah} ${region.pic_nama}`.toLowerCase().includes(query);
  });

  const kpiCards = kpi
    ? [
        {
          label: 'Total Anggota',
          value: kpi.total_anggota,
          note: `Target kapasitas ${kpi.target_capacity}`,
          icon: UserCheck,
          tone: 'bg-emerald-50 text-emerald-700',
          href: '/anggota',
        },
        {
          label: 'Capaian Kuota',
          value: `${kpi.capacity_filled_pct}%`,
          note: `${kpi.mcs_full} MC penuh · ${kpi.mcs_empty} MC kosong`,
          icon: Target,
          tone: 'bg-amber-50 text-amber-700',
          href: '/mc',
        },
        {
          label: 'MC Koordinator',
          value: kpi.total_mcs,
          note: `Maks. 10 anggota per MC`,
          icon: Users,
          tone: 'bg-blue-50 text-blue-700',
          href: '/mc',
        },
        {
          label: 'PIC Wilayah',
          value: kpi.total_pics,
          note: kpi.pics_without_mc > 0 ? `${kpi.pics_without_mc} PIC belum punya MC` : 'Semua PIC punya MC',
          icon: Layers,
          tone: 'bg-purple-50 text-purple-700',
          href: '/pic',
        },
      ]
    : [];

  const totalBySource = kpi ? kpi.via_link + kpi.by_mc : 0;
  const viaLinkPct = totalBySource > 0 && kpi ? Math.round((kpi.via_link / totalBySource) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Dashboard Jenderal"
        subtitle="Ringkasan nasional PIC, MC, dan anggota dalam satu panel."
        refreshing={refreshing}
        onRefresh={reload}
        primaryAction={{
          label: 'Tambah PIC Wilayah',
          onClick: openAddPic,
          icon: Plus,
        }}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {kpi && (
        <>
          {/* Metrik nasional */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className={`rounded-xl p-2.5 ${card.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{card.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{card.note}</p>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Sumber pendaftaran */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">Sumber Pendaftaran</h3>
              <p className="mt-1 text-xs text-slate-500">Cara anggota masuk ke sistem.</p>

              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-blue-500" style={{ width: `${viaLinkPct}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${totalBySource > 0 ? 100 - viaLinkPct : 0}%` }} />
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    Daftar via Link
                  </span>
                  <span className="font-bold text-slate-900">{kpi.via_link}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-600">
                    <UserPlus className="h-4 w-4 text-amber-500" />
                    Ditambahkan MC
                  </span>
                  <span className="font-bold text-slate-900">{kpi.by_mc}</span>
                </div>
              </div>
            </div>

            {/* MC teratas */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">MC dengan Anggota Terbanyak</h3>
                  <p className="mt-1 text-xs text-slate-500">5 MC teratas berdasarkan jumlah anggota.</p>
                </div>
                <Link href="/mc" className="text-xs font-semibold text-[#0d5c4d] hover:underline">
                  Lihat semua MC
                </Link>
              </div>

              {data.top_mcs.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Belum ada MC terdaftar.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.top_mcs.map((mc) => {
                    const pct = Math.min(100, Math.round((mc.anggota / mc.quota_max) * 100));
                    return (
                      <div key={mc.id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="min-w-0 truncate font-medium text-slate-800">
                            {mc.nama}
                            {mc.wilayah && <span className="ml-2 text-xs font-normal text-slate-400">{mc.wilayah}</span>}
                          </span>
                          <span className="ml-3 shrink-0 font-mono text-xs text-slate-600">
                            {mc.anggota}/{mc.quota_max}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : 'bg-[#0d5c4d]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sebaran per wilayah */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sebaran Anggota per Wilayah</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Jumlah MC dan anggota di tiap wilayah PIC dibandingkan kapasitasnya.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari wilayah atau PIC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 max-w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#0d5c4d]"
                />
              </div>
            </div>

            {regions.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {data.regional_distribution.length === 0
                  ? 'Belum ada PIC terdaftar.'
                  : 'Tidak ditemukan wilayah yang sesuai dengan pencarian.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="pb-3 pl-2 font-medium">Wilayah</th>
                      <th className="pb-3 font-medium">PIC</th>
                      <th className="pb-3 text-center font-medium">Jumlah MC</th>
                      <th className="pb-3 font-medium">Anggota / Kapasitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {regions.map((region) => (
                      <tr key={region.pic_id} className="transition hover:bg-slate-50/80">
                        <td className="py-4 pl-2">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {region.wilayah}
                          </span>
                        </td>
                        <td className="py-4 text-slate-600">{region.pic_nama}</td>
                        <td className="py-4 text-center font-mono text-slate-700">{region.total_mc}</td>
                        <td className="py-4">
                          {region.total_mc === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                              Belum ada MC
                            </span>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-[#0d5c4d]"
                                  style={{ width: `${Math.min(100, region.filled_pct)}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-slate-600">
                                {region.total_anggota}/{region.capacity} ({region.filled_pct}%)
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Pendaftar terbaru */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Pendaftar Terbaru</h3>
                <Link href="/anggota" className="text-xs font-semibold text-[#0d5c4d] hover:underline">
                  Lihat semua anggota
                </Link>
              </div>

              {data.recent_members.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Belum ada anggota terdaftar.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {data.recent_members.map((member) => (
                    <li key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{member.nama}</p>
                        <p className="truncate text-xs text-slate-500">
                          {member.mc_nama ?? '-'}
                          {member.wilayah && ` · ${member.wilayah}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            member.created_by === 'mc' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {member.created_by === 'mc' ? 'Ditambahkan MC' : 'Via Link'}
                        </span>
                        <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(member.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Aktivitas terbaru */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <History className="h-4 w-4 text-slate-400" />
                  Aktivitas Terbaru
                </h3>
                <Link href="/audit" className="text-xs font-semibold text-[#0d5c4d] hover:underline">
                  Buka Audit Trail
                </Link>
              </div>

              {data.recent_logs.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Belum ada aktivitas.</p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {data.recent_logs.map((log) => (
                    <li key={log.id} className="flex items-start gap-3 py-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          ROLE_STYLES[log.user_type] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.user_type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-slate-700">{log.description ?? log.action}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          <span className="font-mono">{log.action}</span> · {formatDateTime(log.created_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-right text-[11px] text-slate-400">
            Diperbarui {formatDateTime(data.last_updated)} · otomatis setiap 30 detik
          </p>
        </>
      )}

      {/* Modal Tambah PIC */}
      {showAddPicModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setShowAddPicModal(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Tambah Koordinator Wilayah (PIC)</h2>
            <p className="mt-1 text-xs text-slate-500">
              Menugaskan penanggung jawab wilayah yang akan mengelola MC di wilayah tersebut.
            </p>

            <form onSubmit={handleCreatePic} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Nama Lengkap PIC</label>
                <input
                  required
                  maxLength={100}
                  placeholder="Misal: Drs. Herman Suherman"
                  value={picForm.nama}
                  onChange={(e) => setPicForm({ ...picForm, nama: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Nomor WhatsApp PIC</label>
                <input
                  required
                  type="tel"
                  maxLength={20}
                  placeholder="081234567899"
                  value={picForm.no_hp}
                  onChange={(e) => setPicForm({ ...picForm, no_hp: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Wilayah Operasional</label>
                <input
                  required
                  maxLength={100}
                  placeholder="Misal: Sumatera Utara"
                  value={picForm.wilayah}
                  onChange={(e) => setPicForm({ ...picForm, wilayah: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password Awal</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  value={picForm.password}
                  onChange={(e) => setPicForm({ ...picForm, password: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              {picFormError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{picFormError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAddPicModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Menyimpan...' : 'Simpan Akun PIC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
