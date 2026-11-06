'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Search,
  RefreshCw,
  X,
  MapPin,
  AlertCircle,
  Eye,
  Pencil,
  KeyRound,
  Trash2,
} from 'lucide-react';

import { api, getStoredAuth } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import RegistrationLink from '@/components/RegistrationLink';
import ResetPasswordDialog, { ResetRequestBadge } from '@/components/ResetPasswordDialog';
import AuthGuard from '@/components/auth/AuthGuard';

type Mc = {
  id: number;
  pic_id: number;
  nama: string;
  no_hp: string;
  link_token: string;
  password_reset_requested_at?: string | null;
  anggotas_count?: number;
  quota_max?: number;
  pic?: {
    id: number;
    nama: string;
    wilayah: string;
  } | null;
};

type McMember = {
  id: number;
  nama: string;
  nik: string;
  no_hp: string;
  created_by: 'self' | 'mc';
  created_at: string;
};

type PicOption = {
  id: number;
  nama: string;
  wilayah: string;
};

type McForm = {
  pic_id: string;
  nama: string;
  no_hp: string;
};

const initialForm: McForm = {
  pic_id: '',
  nama: '',
  no_hp: '',
};

function extractRows<T>(response: unknown): T[] {
  const res = response as { data?: T[] | { data?: T[] } };
  const payload = res.data;

  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export default function McListPage() {
  return (
    <AuthGuard allowedRoles={['jenderal', 'pic']}>
      <McList />
    </AuthGuard>
  );
}

function McList() {
  // AuthGuard hanya merender konten ini di browser setelah sesi terbaca.
  const [auth] = useState(() => getStoredAuth());
  const isPic = auth?.role === 'pic';
  const picId = Number(auth?.user?.id);

  const [mcs, setMcs] = useState<Mc[]>([]);
  const [pics, setPics] = useState<PicOption[]>([]);
  const [form, setForm] = useState<McForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [editingMc, setEditingMc] = useState<Mc | null>(null);

  const [detailMc, setDetailMc] = useState<Mc | null>(null);
  const [members, setMembers] = useState<McMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');

  const [deletingMc, setDeletingMc] = useState<Mc | null>(null);
  const [resettingMc, setResettingMc] = useState<Mc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchMcs = useCallback(async () => {
    const response = await api.getMcs();
    const res = response as { success?: boolean; message?: string };

    if (res.success === false) {
      throw new Error(res.message ?? 'Gagal mengambil data MC.');
    }

    return extractRows<Mc>(response);
  }, []);

  const loadMcs = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    }

    setError('');

    try {
      setMcs(await fetchMcs());
    } catch (err) {
      console.error(err);
      setError('Tidak dapat memuat daftar MC. Periksa koneksi API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMcs]);

  useEffect(() => {
    let cancelled = false;

    const fetchInitial = async () => {
      try {
        const [mcRows, picResponse] = await Promise.all([
          fetchMcs(),
          isPic ? Promise.resolve(null) : api.getPics(),
        ]);

        if (cancelled) return;

        setMcs(mcRows);
        if (picResponse) setPics(extractRows<PicOption>(picResponse));
      } catch (err) {
        if (cancelled) return;

        console.error(err);
        setError('Tidak dapat memuat daftar MC. Periksa koneksi API.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [fetchMcs, isPic]);

  const filteredMcs = mcs.filter((mc) => {
    const query = searchQuery.trim().toLowerCase();

    return [mc.nama, mc.no_hp, mc.pic?.nama, mc.pic?.wilayah].some(
      (value) => value?.toLowerCase().includes(query)
    );
  });

  const handleSubmitMc = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      const payload = {
        nama: form.nama.trim(),
        no_hp: form.no_hp.trim(),
      };

      const response = editingMc
        ? isPic
          ? await api.updateMc(picId, editingMc.id, payload)
          : await api.updateMcByJenderal(editingMc.id, {
              ...payload,
              pic_id: Number(form.pic_id),
            })
        : await api.createMc(isPic ? picId : Number(form.pic_id), payload);

      const res = response as { success?: boolean; message?: string };

      if (res.success === false) {
        setModalError(res.message ?? 'MC gagal disimpan.');
        return;
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingMc(null);
      await loadMcs();
    } catch (err) {
      console.error(err);
      setModalError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan MC. Periksa data dan koneksi API.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setError('');
    setModalError('');
    setEditingMc(null);
    setForm({ ...initialForm, pic_id: isPic ? String(picId) : '' });
    setShowModal(true);
  };

  const openEditModal = (mc: Mc) => {
    setError('');
    setModalError('');
    setEditingMc(mc);
    setForm({
      pic_id: String(mc.pic_id),
      nama: mc.nama,
      no_hp: mc.no_hp,
    });
    setShowModal(true);
  };

  const openDetail = async (mc: Mc) => {
    setDetailMc(mc);
    setMembers([]);
    setMembersError('');
    setMembersLoading(true);

    try {
      const res = (await api.getMcDashboard(mc.id)) as {
        success?: boolean;
        message?: string;
        data?: { members?: McMember[] };
      };

      if (res.success === false) {
        setMembersError(res.message ?? 'Gagal memuat daftar anggota.');
        return;
      }

      setMembers(res.data?.members ?? []);
    } catch (err) {
      console.error(err);
      setMembersError(
        err instanceof Error ? err.message : 'Gagal memuat daftar anggota.'
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const handleDeleteMc = async () => {
    if (!deletingMc) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await api.deleteMc(deletingMc.id);
      setDeletingMc(null);
      await loadMcs();
    } catch (err) {
      console.error(err);
      setDeleteError(
        err instanceof Error ? err.message : 'Gagal menghapus MC.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
      <div className="mx-auto max-w-[1500px] space-y-6">
        <PageHeader
          title="MC Koordinator"
          subtitle={
            isPic
              ? 'Daftar MC yang terdaftar di wilayah Anda beserta kuota anggotanya.'
              : 'Kelola seluruh MC beserta PIC dan kuota anggotanya.'
          }
          refreshing={refreshing}
          onRefresh={() => void loadMcs(true)}
          primaryAction={{ label: 'Tambah MC', onClick: openModal }}
        />

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar MC Koordinator
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Menampilkan {filteredMcs.length} dari {mcs.length} MC.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor HP, atau PIC..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#0d5c4d]"
              />
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
              Memuat daftar MC...
            </div>
          ) : filteredMcs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {mcs.length === 0
                ? 'Belum ada MC yang terdaftar.'
                : 'Tidak ditemukan MC yang sesuai dengan pencarian.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="pb-3 pl-2 font-medium">No.</th>
                    <th className="pb-3 font-medium">Nama MC</th>
                    <th className="pb-3 font-medium">No. Handphone</th>
                    <th className="pb-3 font-medium">Link Pendaftaran</th>
                    {!isPic && <th className="pb-3 font-medium">PIC / Wilayah</th>}
                    <th className="pb-3 font-medium">Anggota</th>
                    <th className="pb-3 pr-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredMcs.map((mc, index) => (
                    <tr
                      key={mc.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="py-4 pl-2 text-slate-500">
                        {index + 1}
                      </td>

                      <td className="py-4 font-semibold text-slate-800">
                        {mc.nama}
                        <ResetRequestBadge requestedAt={mc.password_reset_requested_at} />
                      </td>

                      <td className="py-4 text-slate-600">
                        {mc.no_hp || '-'}
                      </td>

                      <td className="py-4">
                        <RegistrationLink token={mc.link_token} compact />
                      </td>

                      {!isPic && (
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {mc.pic?.wilayah || '-'}
                          </span>
                        </td>
                      )}

                      <td className="py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            (mc.anggotas_count ?? 0) >= (mc.quota_max ?? 10)
                              ? 'bg-red-50 text-red-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {mc.anggotas_count ?? 0}/{mc.quota_max ?? 10}
                        </span>
                      </td>

                      <td className="py-4 pr-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openDetail(mc)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-[#0d5c4d]"
                            aria-label={`Lihat anggota ${mc.nama}`}
                            title="Detail Anggota"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(mc)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Edit ${mc.nama}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingMc(mc)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                            aria-label={`Reset password ${mc.nama}`}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          {!isPic && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError('');
                                setDeletingMc(mc);
                              }}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Hapus ${mc.nama}`}
                              title="Hapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !submitting) {
                setShowModal(false);
              }
            }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingMc ? 'Edit MC Koordinator' : 'Tambah MC Koordinator'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {editingMc
                      ? 'Perbarui informasi MC yang dipilih.'
                      : 'Masukkan informasi MC yang akan didaftarkan.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Tutup modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitMc} className="space-y-4">
                {isPic ? (
                  <p className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    MC akan terdaftar di wilayah Anda.
                  </p>
                ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    PIC Wilayah
                  </label>
                  <select
                    required
                    value={form.pic_id}
                    onChange={(e) =>
                      setForm({ ...form, pic_id: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                  >
                    <option value="" disabled>
                      Pilih PIC
                    </option>
                    {pics.map((pic) => (
                      <option key={pic.id} value={pic.id}>
                        {pic.nama} — {pic.wilayah}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nama MC
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={form.nama}
                    onChange={(e) =>
                      setForm({ ...form, nama: e.target.value })
                    }
                    placeholder="Masukkan nama lengkap"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nomor Handphone
                  </label>
                  <input
                    required
                    maxLength={20}
                    type="tel"
                    value={form.no_hp}
                    onChange={(e) =>
                      setForm({ ...form, no_hp: e.target.value })
                    }
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                  />
                </div>

                {!editingMc && (
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    Link pendaftaran anggota yang unik akan dibuat otomatis
                    untuk MC ini setelah disimpan.
                  </p>
                )}

                {modalError && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:opacity-50"
                  >
                    {submitting && (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    )}
                    {submitting
                      ? 'Menyimpan...'
                      : editingMc
                        ? 'Simpan Perubahan'
                        : 'Simpan MC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {detailMc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDetailMc(null);
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {detailMc.nama}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{detailMc.no_hp}</span>
                    {detailMc.pic && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {detailMc.pic.nama} ({detailMc.pic.wilayah})
                      </span>
                    )}
                  </p>
                  <div className="mt-2">
                    <RegistrationLink token={detailMc.link_token} />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailMc(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Tutup detail"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {membersLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
                  Memuat daftar anggota...
                </div>
              ) : membersError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{membersError}</span>
                </div>
              ) : (
                <div className="min-h-0 space-y-5 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Anggota', value: `${members.length}/${detailMc.quota_max ?? 10}` },
                      { label: 'Daftar via Link', value: members.filter((m) => m.created_by === 'self').length },
                      { label: 'Ditambahkan MC', value: members.filter((m) => m.created_by === 'mc').length },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-xs text-slate-500">{stat.label}</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-bold text-slate-900">
                      Anggota yang Dikelola ({members.length})
                    </h3>

                    {members.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                        MC ini belum mengelola anggota.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left text-sm">
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
                                <td className="py-3 pl-2 text-slate-500">
                                  {index + 1}
                                </td>
                                <td className="py-3 font-semibold text-slate-800">
                                  {member.nama}
                                </td>
                                <td className="py-3 font-mono text-xs text-slate-600">
                                  {member.nik}
                                </td>
                                <td className="py-3 text-slate-600">
                                  {member.no_hp}
                                </td>
                                <td className="py-3">
                                  <div className="text-slate-700">
                                    {member.created_by === 'mc' ? 'Oleh MC' : 'Mandiri'}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {member.created_at}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {resettingMc && (
          <ResetPasswordDialog
            targetName={resettingMc.nama}
            targetRole="MC"
            onReset={async () => {
              const res = (await (isPic
                ? api.resetMcPasswordByPic(picId, resettingMc.id)
                : api.resetMcPasswordByJenderal(resettingMc.id))) as {
                data?: { temporary_password?: string };
              };
              return res.data?.temporary_password ?? '';
            }}
            onDone={() => void loadMcs()}
            onClose={() => setResettingMc(null)}
          />
        )}

        {deletingMc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) {
                setDeletingMc(null);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-xl bg-red-50 p-2.5">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Hapus MC?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Akun <span className="font-semibold">{deletingMc.nama}</span>{' '}
                    akan dihapus permanen dan link pendaftarannya tidak dapat
                    dipakai lagi. Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeletingMc(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDeleteMc()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {deleting ? 'Menghapus...' : 'Hapus MC'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
