'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Search,
  RefreshCw,
  MapPin,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { api, getStoredAuth } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/auth/AuthGuard';

type Role = 'jenderal' | 'pic' | 'mc';

type Anggota = {
  id: number;
  nama: string;
  nik: string;
  no_hp: string;
  created_by: 'self' | 'mc';
  created_at: string;
  mc?: {
    id: number;
    nama: string;
    pic?: {
      id: number;
      nama: string;
      wilayah: string;
    } | null;
  } | null;
};

type AnggotaPage = {
  data: Anggota[];
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

type Summary = {
  total: number;
  via_link: number;
  by_mc: number;
  quota_max?: number;
};

const SUBTITLES: Record<Role, string> = {
  jenderal: 'Daftar seluruh anggota beserta MC dan wilayahnya.',
  pic: 'Daftar anggota dari seluruh MC di wilayah Anda.',
  mc: 'Daftar anggota yang terdaftar di kelompok Anda.',
};

const SOURCE_FILTERS = [
  { value: '', label: 'Semua' },
  { value: 'self', label: 'Daftar via Link' },
  { value: 'mc', label: 'Ditambahkan MC' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AnggotaListPage() {
  return (
    <AuthGuard allowedRoles={['jenderal', 'pic', 'mc']}>
      <AnggotaList />
    </AuthGuard>
  );
}

function AnggotaList() {
  // AuthGuard hanya merender konten ini di browser setelah sesi terbaca.
  const [role] = useState(() => (getStoredAuth()?.role ?? 'jenderal') as Role);

  const [anggotas, setAnggotas] = useState<Anggota[]>([]);
  const [meta, setMeta] = useState<Omit<AnggotaPage, 'data'> | null>(null);
  const [summary, setSummary] = useState<Summary>({ total: 0, via_link: 0, by_mc: 0 });
  const [page, setPage] = useState(1);
  const [source, setSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const showMcColumn = role !== 'mc';
  const showWilayahColumn = role === 'jenderal';

  useEffect(() => {
    let cancelled = false;

    const loadAnggotas = async () => {
      try {
        const res = (await api.getAnggotas({
          search: appliedSearch || undefined,
          source: source || undefined,
          page,
        })) as {
          success?: boolean;
          message?: string;
          data?: AnggotaPage;
          summary?: Summary;
        };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal mengambil data anggota.');
          return;
        }

        setError('');
        const { data, ...rest } = res.data;
        setAnggotas(data ?? []);
        setMeta(rest);
        if (res.summary) setSummary(res.summary);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Tidak dapat memuat daftar anggota. Periksa koneksi API.',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadAnggotas();

    return () => {
      cancelled = true;
    };
  }, [appliedSearch, source, page, reloadKey]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Anggota"
        subtitle={SUBTITLES[role]}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setReloadKey((k) => k + 1);
        }}
      />

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Daftar Anggota</h3>
          <p className="mt-1 text-xs text-slate-500">
            {meta && meta.total > 0
              ? `Menampilkan ${meta.from}–${meta.to} dari ${meta.total} anggota.`
              : 'Belum ada anggota.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  role === 'mc'
                    ? 'Cari nama, NIK, atau nomor WA...'
                    : 'Cari nama, NIK, nomor WA, atau MC...'
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#0d5c4d]"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cari
            </button>
          </form>

          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {SOURCE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setPage(1);
                  setSource(filter.value);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  source === filter.value
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
            Memuat daftar anggota...
          </div>
        ) : anggotas.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {summary.total === 0
              ? role === 'mc'
                ? 'Belum ada anggota yang terdaftar. Bagikan link pendaftaran Anda dari Dashboard.'
                : 'Belum ada anggota yang terdaftar.'
              : 'Tidak ditemukan anggota yang sesuai dengan pencarian.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-3 pl-2 font-medium">No.</th>
                  <th className="pb-3 font-medium">Nama Anggota</th>
                  <th className="pb-3 font-medium">NIK</th>
                  <th className="pb-3 font-medium">No. WhatsApp</th>
                  {showMcColumn && <th className="pb-3 font-medium">MC</th>}
                  {showWilayahColumn && <th className="pb-3 font-medium">PIC / Wilayah</th>}
                  <th className="pb-3 pr-2 font-medium">Didaftarkan</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {anggotas.map((anggota, index) => (
                  <tr key={anggota.id} className="transition hover:bg-slate-50/80">
                    <td className="py-4 pl-2 text-slate-500">{(meta?.from ?? 1) + index}</td>

                    <td className="py-4 font-semibold text-slate-800">{anggota.nama}</td>

                    <td className="py-4 font-mono text-xs text-slate-600">{anggota.nik}</td>

                    <td className="py-4 text-slate-600">{anggota.no_hp || '-'}</td>

                    {showMcColumn && (
                      <td className="py-4 text-slate-700">{anggota.mc?.nama ?? '-'}</td>
                    )}

                    {showWilayahColumn && (
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {anggota.mc?.pic?.wilayah ?? '-'}
                        </span>
                        {anggota.mc?.pic && (
                          <div className="mt-0.5 text-xs text-slate-400">{anggota.mc.pic.nama}</div>
                        )}
                      </td>
                    )}

                    <td className="py-4 pr-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          anggota.created_by === 'mc'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {anggota.created_by === 'mc' ? 'Ditambahkan MC' : 'Via Link'}
                      </span>
                      <div className="mt-1 text-xs text-slate-400">{formatDate(anggota.created_at)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Halaman {meta.current_page} dari {meta.last_page}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1 || refreshing}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page || refreshing}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
