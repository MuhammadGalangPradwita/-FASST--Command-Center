'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Link2,
  MapPin,
  MessageSquare,
} from 'lucide-react';

import { api, getStoredAuth } from '@/lib/api';
import AuthGuard from '@/components/auth/AuthGuard';
import PageHeader from '@/components/PageHeader';
import RegistrationLink, { getRegistrationUrl } from '@/components/RegistrationLink';

type McDashboard = {
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
    remaining: number;
    percentage: number;
    is_full: boolean;
  };
  members: Member[];
};

type Member = {
  id: number;
  nama: string;
  nik: string;
  no_hp: string;
  created_by: 'self' | 'mc';
  created_at: string;
};

type MemberForm = {
  nama: string;
  nik: string;
  no_hp: string;
};

const initialForm: MemberForm = { nama: '', nik: '', no_hp: '' };

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function McDashboardPage() {
  return (
    <AuthGuard allowedRoles={['mc']}>
      <McDashboardContent />
    </AuthGuard>
  );
}

function McDashboardContent() {
  // AuthGuard hanya merender konten ini di browser setelah sesi MC terbaca.
  const [mcId] = useState(() => Number(getStoredAuth()?.user?.id));

  const [data, setData] = useState<McDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const res = (await api.getMcDashboard(mcId)) as {
          success?: boolean;
          message?: string;
          data?: McDashboard;
        };

        if (cancelled) return;

        if (res.success === false || !res.data) {
          setError(res.message ?? 'Gagal memuat dashboard MC.');
          return;
        }

        setError('');
        setData(res.data);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(getErrorMessage(err, 'Gagal memuat dashboard MC.'));
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
  }, [mcId, reloadKey]);

  const reload = () => {
    setRefreshing(true);
    setReloadKey((k) => k + 1);
  };

  const openAddForm = () => {
    setEditingMember(null);
    setForm(initialForm);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (member: Member) => {
    setEditingMember(member);
    setForm({ nama: member.nama, nik: member.nik, no_hp: member.no_hp });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload = {
      nama: form.nama.trim(),
      nik: form.nik.trim(),
      no_hp: form.no_hp.trim(),
    };

    try {
      if (editingMember) {
        await api.updateMemberByMc(mcId, editingMember.id, payload);
      } else {
        await api.addMemberByMc(mcId, payload);
      }

      setShowForm(false);
      setEditingMember(null);
      reload();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Gagal menyimpan data anggota.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;

    setDeleting(true);
    setDeleteError('');

    try {
      await api.deleteMemberByMc(mcId, deletingMember.id);
      setDeletingMember(null);
      reload();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Gagal menghapus anggota.'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#0d5c4d]" />
        Memuat dashboard MC...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || 'Data MC tidak ditemukan.'}</span>
        </div>
      </div>
    );
  }

  const { mc, quota, members } = data;
  const registrationUrl = getRegistrationUrl(mc.link_token);
  const shareText = `Halo! Silakan daftar sebagai anggota tim melalui link berikut: ${registrationUrl}`;

  const filteredMembers = members.filter((member) => {
    const query = search.trim().toLowerCase();
    return [member.nama, member.nik, member.no_hp].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  const stats = [
    { label: 'Daftar via Link', value: members.filter((m) => m.created_by === 'self').length, icon: Link2, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Ditambahkan MC', value: members.filter((m) => m.created_by === 'mc').length, icon: UserPlus, tone: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title={`Halo, ${mc.nama}`}
        subtitle="Kelola anggota kelompok Anda dan bagikan link pendaftaran."
      />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ringkasan kuota anggota */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Kuota Anggota</p>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                quota.is_full
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {quota.is_full ? 'PENUH' : `Sisa ${quota.remaining}`}
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {quota.current}/{quota.max}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${quota.is_full ? 'bg-red-500' : 'bg-[#0d5c4d]'}`}
              style={{ width: `${Math.min(100, quota.percentage)}%` }}
            />
          </div>
        </div>

        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
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

      {/* Link pendaftaran */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Link2 className="h-4 w-4 text-[#0d5c4d]" />
              Link Pendaftaran Anggota
            </h3>
            <p className="text-xs text-slate-500">
              Bagikan link ini ke calon anggota. Yang mendaftar lewat link ini
              otomatis masuk ke kelompok Anda.
            </p>
            <p className="break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
              {registrationUrl}
            </p>
            {quota.is_full && (
              <p className="text-xs font-medium text-red-600">
                Kuota sudah penuh — form pendaftaran pada link ini otomatis ditutup.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <RegistrationLink token={mc.link_token} compact />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d5c4d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#09483c]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Bagikan via WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Daftar anggota */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daftar Anggota</h3>
            <p className="mt-1 text-xs text-slate-500">
              Menampilkan {filteredMembers.length} dari {members.length} anggota.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-64 max-w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none focus:border-[#0d5c4d]"
              />
            </div>

            <button
              type="button"
              onClick={reload}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Muat ulang"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={openAddForm}
              disabled={quota.is_full}
              title={quota.is_full ? 'Kuota anggota sudah penuh' : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <UserPlus className="h-4 w-4" />
              Tambah Anggota
            </button>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            Belum ada anggota. Bagikan link pendaftaran atau tambahkan anggota secara manual.
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Tidak ditemukan anggota yang sesuai dengan pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="pb-3 pl-2 font-medium">No.</th>
                  <th className="pb-3 font-medium">Nama Anggota</th>
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium">NIK</th>
                  <th className="pb-3 font-medium">No. WhatsApp</th>
                  <th className="pb-3 font-medium">Didaftarkan</th>
                  <th className="pb-3 pr-2 text-right font-medium">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member, index) => (
                  <tr key={member.id} className="transition hover:bg-slate-50/80">
                    <td className="py-4 pl-2 text-slate-500">{index + 1}</td>
                    <td className="py-4 font-semibold text-slate-800">{member.nama}</td>
                    <td className="py-4 text-slate-600">{member.created_at}</td>
                    <td className="py-4 font-mono text-xs text-slate-600">{member.nik}</td>
                    <td className="py-4 text-slate-600">{member.no_hp}</td>
                    <td className="py-4">
                      <div className="text-slate-700">
                        {member.created_by === 'mc' ? 'MC' : 'Mandiri (link)'}
                      </div>
                    </td>
                    <td className="py-4 pr-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(member)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                          aria-label={`Edit ${member.nama}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeletingMember(member);
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Hapus ${member.nama}`}
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

      {/* Modal tambah / edit anggota */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowForm(false);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingMember ? 'Edit Anggota' : 'Tambah Anggota'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingMember
                    ? 'Perbarui data diri anggota.'
                    : `Sisa kuota: ${quota.remaining} dari ${quota.max}.`}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nama Lengkap (Sesuai KTP)
                </label>
                <input
                  required
                  maxLength={100}
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  NIK (16 digit)
                </label>
                <input
                  required
                  inputMode="numeric"
                  maxLength={16}
                  pattern="[0-9]{16}"
                  value={form.nik}
                  onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, '') })}
                  placeholder="3171012301900099"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#0d5c4d]"
                />
                <span className="mt-1 block font-mono text-[11px] text-slate-400">
                  {form.nik.length}/16 digit
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nomor WhatsApp
                </label>
                <input
                  required
                  type="tel"
                  maxLength={20}
                  value={form.no_hp}
                  onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                  placeholder="081234567890"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0d5c4d]"
                />
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || form.nik.length !== 16}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0d5c4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#09483c] disabled:opacity-50"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {saving
                    ? 'Menyimpan...'
                    : editingMember
                      ? 'Simpan Perubahan'
                      : 'Tambah Anggota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus */}
      {deletingMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeletingMember(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-red-50 p-2.5">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Hapus Anggota?</h2>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold">{deletingMember.nama}</span>{' '}
                  akan dikeluarkan dari kelompok Anda dan slot kuotanya kembali
                  tersedia. Tindakan ini tidak dapat dibatalkan.
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
                onClick={() => setDeletingMember(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <RefreshCw className="h-4 w-4 animate-spin" />}
                {deleting ? 'Menghapus...' : 'Hapus Anggota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
