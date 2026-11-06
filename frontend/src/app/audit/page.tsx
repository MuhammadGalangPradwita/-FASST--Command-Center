'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';

type LogActivity = {
  id: number;
  user_type: string;
  user_id: number | null;
  action: string;
  description: string | null;
  ip_address: string | null;
  created_at: string;
};

type LogPage = {
  data: LogActivity[];
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

const ROLE_STYLES: Record<string, string> = {
  jenderal: 'bg-purple-50 text-purple-700',
  pic: 'bg-blue-50 text-blue-700',
  mc: 'bg-emerald-50 text-[#0d5c4d]',
  anggota: 'bg-amber-50 text-amber-700',
};

function getActionStyle(action: string): string {
  if (action.includes('DELETE') || action.includes('REJECTED')) {
    return 'bg-red-50 text-red-700 border-red-100';
  }
  if (action.includes('CREATE') || action.includes('REGISTER')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
  if (action.includes('UPDATE')) {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function formatDate(value: string) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<LogActivity[]>([]);
  const [meta, setMeta] = useState<Omit<LogPage, 'data'> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadLogs = async () => {
      try {
        const res = (await api.getAuditLogs({
          user_type: userTypeFilter || undefined,
          search: appliedSearch || undefined,
          page,
        })) as { success?: boolean; message?: string; data?: LogPage };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal memuat audit trail.');
          return;
        }

        setError('');
        const { data, ...rest } = res.data;
        setLogs(data ?? []);
        setMeta(rest);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : 'Gagal memuat audit trail.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadLogs();

    return () => {
      cancelled = true;
    };
  }, [userTypeFilter, appliedSearch, page, reloadKey]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Audit Trail"
        subtitle="Pencatatan riwayat transaksi dan aktivitas sistem secara real-time."
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          setReloadKey((k) => k + 1);
        }}
      />

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Aktivitas Tercatat
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {meta && meta.total > 0
              ? `Menampilkan ${meta.from}–${meta.to} dari ${meta.total} entri.`
              : 'Belum ada entri.'}
          </p>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari deskripsi, aksi, atau IP address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0d5c4d]"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Cari
            </button>
          </form>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={userTypeFilter}
              onChange={(e) => {
                setPage(1);
                setUserTypeFilter(e.target.value);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#0d5c4d]"
            >
              <option value="">Semua Peran</option>
              <option value="jenderal">Jenderal</option>
              <option value="pic">PIC</option>
              <option value="mc">MC</option>
              <option value="anggota">Anggota</option>
              <option value="system">Sistem</option>
            </select>
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
            Memuat audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Tidak ada catatan yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="w-12 pb-3 pl-2 font-medium">No.</th>
                  <th className="w-40 pb-3 font-medium">Tanggal</th>
                  <th className="w-28 pb-3 font-medium">Role</th>
                  <th className="w-52 pb-3 font-medium">Aksi</th>
                  <th className="pb-3 font-medium">Deskripsi</th>
                 
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {logs.map((log, index) => {
                  const { date, time } = formatDate(log.created_at);

                  return (
                    <tr key={log.id} className="align-top transition hover:bg-slate-50/80">
                      <td className="py-4 pl-2 text-slate-500">
                        {(meta?.from ?? 1) + index}
                      </td>

                      <td className="whitespace-nowrap py-4">
                        <div className="font-medium text-slate-800">{date}</div>
                        {/* <div className="mt-0.5 font-mono text-xs text-slate-400">{time}</div> */}
                      </td>

                      <td className="py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            ROLE_STYLES[log.user_type] ?? 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.user_type}
                        </span>
                        {/* {log.user_id !== null && (
                          <div className="mt-1 text-xs text-slate-400">ID #{log.user_id}</div>
                        )} */}
                      </td>

                      <td className="py-4">
                        <span
                          className={`inline-block rounded-lg border px-2 py-1 font-mono text-[11px] font-semibold ${getActionStyle(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-4 leading-relaxed text-slate-600">
                        {log.description || '-'}
                      </td>
                    </tr>
                  );
                })}
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
