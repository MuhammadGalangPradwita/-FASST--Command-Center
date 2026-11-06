'use client';

import { useEffect, useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';

import { api } from '@/lib/api';
import RegistrationLink from '@/components/RegistrationLink';

type Member = {
  id: number;
  nama: string;
  nik: string;
  no_hp: string;
  created_by: 'self' | 'mc';
  created_at: string;
};

type McDetail = {
  mc: {
    id: number;
    nama: string;
    no_hp: string;
    link_token: string;
    pic_nama: string | null;
    wilayah: string | null;
  };
  quota: {
    current: number;
    max: number;
  };
  members: Member[];
};

interface McMembersModalProps {
  mcId: number;
  mcNama: string;
  onClose: () => void;
}

/**
 * Popup detail anggota milik satu MC. Ditumpuk di atas popup lain (z-60).
 */
export default function McMembersModal({ mcId, mcNama, onClose }: McMembersModalProps) {
  const [detail, setDetail] = useState<McDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      try {
        const res = (await api.getMcDashboard(mcId)) as {
          success?: boolean;
          message?: string;
          data?: McDetail;
        };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal memuat detail anggota.');
          return;
        }

        setDetail(res.data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error && err.message ? err.message : 'Gagal memuat detail anggota.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [mcId]);

  const members = detail?.members ?? [];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Detail Anggota MC</p>
            <h2 className="text-lg font-bold text-slate-900">{detail?.mc.nama ?? mcNama}</h2>
            {detail && (
              <>
                <p className="mt-1 text-xs text-slate-500">
                  {detail.mc.no_hp}
                  {detail.mc.pic_nama && ` · PIC: ${detail.mc.pic_nama}`}
                  {detail.mc.wilayah && ` (${detail.mc.wilayah})`}
                </p>
                <div className="mt-2">
                  <RegistrationLink token={detail.mc.link_token} />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Tutup detail anggota"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
            Memuat daftar anggota...
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : detail && (
          <div className="min-h-0 space-y-5 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Anggota', value: `${detail.quota.current}/${detail.quota.max}` },
                { label: 'Daftar via Link', value: members.filter((m) => m.created_by === 'self').length },
                { label: 'Ditambahkan MC', value: members.filter((m) => m.created_by === 'mc').length },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                MC ini belum memiliki anggota.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400">
                      <th className="pb-3 pl-2 font-medium">No.</th>
                      <th className="pb-3 font-medium">Nama Anggota</th>
                      <th className="pb-3 font-medium">NIK</th>
                      <th className="pb-3 font-medium">No. WhatsApp</th>
                      <th className="pb-3 font-medium">Didaftarkan</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {members.map((member, index) => (
                      <tr key={member.id}>
                        <td className="py-3 pl-2 text-slate-500">{index + 1}</td>
                        <td className="py-3 font-semibold text-slate-800">{member.nama}</td>
                        <td className="py-3 font-mono text-xs text-slate-600">{member.nik}</td>
                        <td className="py-3 text-slate-600">{member.no_hp}</td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              member.created_by === 'mc'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {member.created_by === 'mc' ? 'Ditambahkan MC' : 'Via Link'}
                          </span>
                          <div className="mt-1 text-xs text-slate-400">{member.created_at}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
