
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

import { api } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/auth/AuthGuard';
import RegistrationLink from '@/components/RegistrationLink';
import McMembersModal from '@/components/McMembersModal';
import ResetPasswordDialog, { ResetRequestBadge } from '@/components/ResetPasswordDialog';

type Pic = {
  id: number;
  nama: string;
  no_hp: string;
  wilayah: string;
  mcs_count?: number;
  password_reset_requested_at?: string | null;
};

type PicForm = {
  nama: string;
  no_hp: string;
  wilayah: string;
  password: string;
};

type PicDetail = {
  pic: {
    id: number;
    nama: string;
    no_hp: string;
    wilayah: string;
  };
  summary: {
    total_mcs: number;
    total_registered: number;
    target_voters: number;
  };
  mcs: {
    id: number;
    nama: string;
    no_hp: string;
    link_token: string;
    quota_count: number;
    quota_max: number;
    is_full: boolean;
  }[];
};

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

const initialForm: PicForm = {
  nama: '',
  no_hp: '',
  wilayah: '',
  password: '',
};

export default function PicListPage() {
  return (
    <AuthGuard allowedRoles={['jenderal']}>
      <PicList />
    </AuthGuard>
  );
}

function PicList() {
  const [pics, setPics] = useState<Pic[]>([]);
  const [form, setForm] = useState<PicForm>(initialForm);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [editingPic, setEditingPic] = useState<Pic | null>(null);

  const [detail, setDetail] = useState<PicDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [memberMc, setMemberMc] = useState<{ id: number; nama: string } | null>(null);

  const [deletingPic, setDeletingPic] = useState<Pic | null>(null);
  const [resettingPic, setResettingPic] = useState<Pic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadPics = useCallback(async (manual = false) => {
  if (manual) {
    setRefreshing(true);
  }

  setError('');

  try {
    const response = await api.getPics();

    const res = response as {
      success?: boolean;
      data?: Pic[] | { data?: Pic[] };
      message?: string;
    };

    if (res.success === false) {
      setError(res.message ?? 'Gagal mengambil data PIC.');
      return;
    }

    const payload = res.data;

    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    setPics(rows);
  } catch (err) {
    console.error(err);
    setError('Tidak dapat memuat daftar PIC. Periksa koneksi API.');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

useEffect(() => {
  let cancelled = false;

  const fetchPics = async () => {
    try {
      const response = await api.getPics();

      if (cancelled) return;

      const res = response as {
        success?: boolean;
        data?: Pic[] | { data?: Pic[] };
        message?: string;
      };

      if (res.success === false) {
        setError(res.message ?? 'Gagal mengambil data PIC.');
        return;
      }

      const payload = res.data;
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setPics(rows);
    } catch (err) {
      if (cancelled) return;

      console.error(err);
      setError('Tidak dapat memuat daftar PIC. Periksa koneksi API.');
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  void fetchPics();

  return () => {
    cancelled = true;
  };
}, []);

  const filteredPics = pics.filter((pic) => {
    const query = searchQuery.trim().toLowerCase();

    return [pic.nama, pic.no_hp, pic.wilayah].some((value) =>
      value?.toLowerCase().includes(query)
    );
  });

  const handleSubmitPic = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    const payload = {
      nama: form.nama.trim(),
      no_hp: form.no_hp.trim(),
      wilayah: form.wilayah.trim(),
    };

    try {
      const response = editingPic
        ? await api.updatePic(editingPic.id, payload)
        : await api.createPic({ ...payload, password: form.password });

      const res = response as {
        success?: boolean;
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (res.success === false) {
        setModalError(res.message ?? 'PIC gagal disimpan.');
        return;
      }

      setShowModal(false);
      setForm(initialForm);
      setEditingPic(null);
      await loadPics();
    } catch (err) {
      console.error(err);
      setModalError(
        getErrorMessage(err, 'Gagal menyimpan PIC. Periksa data dan koneksi API.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setError('');
    setModalError('');
    setEditingPic(null);
    setForm(initialForm);
    setShowModal(true);
  };

  const openEditModal = (pic: Pic) => {
    setError('');
    setModalError('');
    setEditingPic(pic);
    setForm({
      nama: pic.nama,
      no_hp: pic.no_hp,
      wilayah: pic.wilayah,
      password: '',
    });
    setShowModal(true);
  };

  const openDetail = async (pic: Pic) => {
    setShowDetail(true);
    setDetail(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const res = (await api.getPicDashboard(pic.id)) as {
        success?: boolean;
        message?: string;
        data?: PicDetail;
      };

      if (res.success === false || !res.data) {
        setDetailError(res.message ?? 'Gagal memuat detail PIC.');
        return;
      }

      setDetail(res.data);
    } catch (err) {
      console.error(err);
      setDetailError(getErrorMessage(err, 'Gagal memuat detail PIC.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeleteModal = (pic: Pic) => {
    setDeleteError('');
    setDeletingPic(pic);
  };

  const handleDeletePic = async () => {
    if (!deletingPic) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await api.deletePic(deletingPic.id);
      setDeletingPic(null);
      await loadPics();
    } catch (err) {
      console.error(err);
      setDeleteError(getErrorMessage(err, 'Gagal menghapus PIC.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
      <div className="mx-auto max-w-[1500px] space-y-6">
        <PageHeader
          title="PIC Wilayah"
          subtitle="Kelola seluruh PIC dan wilayah koordinasinya."
          refreshing={refreshing}
          onRefresh={() => void loadPics(true)}
          primaryAction={{ label: 'Tambah PIC', onClick: openModal }}
        />

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Daftar PIC Wilayah
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Menampilkan {filteredPics.length} dari {pics.length} PIC.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, nomor HP, atau wilayah..."
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
              Memuat daftar PIC...
            </div>
          ) : filteredPics.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {pics.length === 0
                ? 'Belum ada PIC yang terdaftar.'
                : 'Tidak ditemukan PIC yang sesuai dengan pencarian.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400">
                    <th className="pb-3 pl-2 font-medium">No.</th>
                    <th className="pb-3 font-medium">Nama PIC</th>
                    <th className="pb-3 font-medium">No. Handphone</th>
                    <th className="pb-3 font-medium">Wilayah</th>
                    <th className="pb-3 font-medium">Jumlah MC</th>
                    <th className="pb-3 pr-2 text-right font-medium">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPics.map((pic, index) => (
                    <tr
                      key={pic.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="py-4 pl-2 text-slate-500">
                        {index + 1}
                      </td>

                      <td className="py-4 font-semibold text-slate-800">
                        {pic.nama}
                        <ResetRequestBadge requestedAt={pic.password_reset_requested_at} />
                      </td>

                      <td className="py-4 text-slate-600">
                        {pic.no_hp || '-'}
                      </td>

                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {pic.wilayah || '-'}
                        </span>
                      </td>

                      <td className="py-4 text-slate-600">
                        {pic.mcs_count ?? 0} MC
                      </td>

                      <td className="py-4 pr-2">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => void openDetail(pic)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-[#0d5c4d]"
                            aria-label={`Lihat detail ${pic.nama}`}
                            title="Detail"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(pic)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={`Edit ${pic.nama}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingPic(pic)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                            aria-label={`Reset password ${pic.nama}`}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(pic)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Hapus ${pic.nama}`}
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
                    {editingPic ? 'Edit PIC Wilayah' : 'Tambah PIC Wilayah'}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {editingPic
                      ? 'Perbarui informasi PIC yang dipilih.'
                      : 'Masukkan informasi PIC yang akan didaftarkan.'}
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

              <form onSubmit={handleSubmitPic} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nama PIC
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

                {!editingPic && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Password Awal
                  </label>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Minimal 8 karakter"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                  />
                </div>
                )}

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Wilayah
                  </label>
                  <input
                    required
                    maxLength={100}
                    value={form.wilayah}
                    onChange={(e) =>
                      setForm({ ...form, wilayah: e.target.value })
                    }
                    placeholder="Contoh: Jawa Barat"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                  />
                </div>

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
                      : editingPic
                        ? 'Simpan Perubahan'
                        : 'Simpan PIC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetail(false);
              }
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {detail?.pic.nama ?? 'Detail PIC'}
                  </h2>
                  {detail && (
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {detail.pic.wilayah}
                      </span>
                      <span>{detail.pic.no_hp}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowDetail(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Tutup detail"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
                  Memuat detail PIC...
                </div>
              ) : detailError ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{detailError}</span>
                </div>
              ) : detail && (
                <div className="min-h-0 space-y-5 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Jumlah MC', value: detail.summary.total_mcs },
                      { label: 'Anggota Terdaftar', value: `${detail.summary.total_registered}/${detail.summary.target_voters}` },
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
                      MC yang Dikelola ({detail.mcs.length})
                    </h3>

                    {detail.mcs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                        PIC ini belum mengelola MC.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-xs text-slate-400">
                              <th className="pb-3 pl-2 font-medium">No.</th>
                              <th className="pb-3 font-medium">Nama MC</th>
                              <th className="pb-3 font-medium">No. Handphone</th>
                              <th className="pb-3 font-medium">Link Pendaftaran</th>
                              <th className="pb-3 font-medium">Kuota Anggota</th>
                              <th className="pb-3 pr-2 text-right font-medium">Aksi</th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-slate-100">
                            {detail.mcs.map((mc, index) => (
                              <tr key={mc.id}>
                                <td className="py-3 pl-2 text-slate-500">
                                  {index + 1}
                                </td>
                                <td className="py-3 font-semibold text-slate-800">
                                  {mc.nama}
                                </td>
                                <td className="py-3 text-slate-600">
                                  {mc.no_hp || '-'}
                                </td>
                                <td className="py-3">
                                  <RegistrationLink token={mc.link_token} compact />
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      mc.is_full
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {mc.quota_count}/{mc.quota_max}
                                  </span>
                                </td>
                                <td className="py-3 pr-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setMemberMc({ id: mc.id, nama: mc.nama })}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-[#0d5c4d]"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Lihat Anggota
                                  </button>
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

        {memberMc && (
          <McMembersModal
            mcId={memberMc.id}
            mcNama={memberMc.nama}
            onClose={() => setMemberMc(null)}
          />
        )}

        {resettingPic && (
          <ResetPasswordDialog
            targetName={resettingPic.nama}
            targetRole="PIC"
            onReset={async () => {
              const res = (await api.resetPicPassword(resettingPic.id)) as {
                data?: { temporary_password?: string };
              };
              return res.data?.temporary_password ?? '';
            }}
            onDone={() => void loadPics()}
            onClose={() => setResettingPic(null)}
          />
        )}

        {deletingPic && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) {
                setDeletingPic(null);
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
                    Hapus PIC?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Akun <span className="font-semibold">{deletingPic.nama}</span>{' '}
                    ({deletingPic.wilayah}) akan dihapus permanen
                    {(deletingPic.mcs_count ?? 0) > 0 && (
                      <>
                        {' '}beserta{' '}
                        <span className="font-semibold">
                          {deletingPic.mcs_count} MC
                        </span>{' '}
                        yang dikelolanya
                      </>
                    )}
                    . Tindakan ini tidak dapat dibatalkan.
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
                  onClick={() => setDeletingPic(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDeletePic()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {deleting ? 'Menghapus...' : 'Hapus PIC'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
