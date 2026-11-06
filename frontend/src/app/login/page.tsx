'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Crown,
  Network,
  Users,
  UserRound,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Phone,
  CheckCircle2,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';

import { api, setStoredAuth } from '@/lib/api';
import { getRoleHome, type UserRole } from '@/lib/permissions';

type Role = 'jenderal' | 'pic' | 'mc';

interface AuthUser {
  [key: string]: unknown;
  id?: number | string;
  nama?: string;
  role?: Role;
}

interface AuthData {
  [key: string]: unknown;
  token: string;
  role?: Role;
  user?: AuthUser;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: AuthData;
  token?: string;
  role?: Role;
  user?: AuthUser;
}

// Akun demo hanya diisi otomatis jika NEXT_PUBLIC_SHOW_DEMO=true (JANGAN di production).
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === 'true';
const DEMO_IDENTIFIER = 'jenderal@kemenangan.id';
const DEMO_PASSWORD = 'password123';

const STAFF_ROLES: UserRole[] = ['jenderal', 'pic', 'mc'];

// Hanya untuk panel informasi; peran saat login dideteksi otomatis oleh server.
const ROLE_CONFIGS: Record<Role, { title: string; description: string; icon: LucideIcon }> = {
  jenderal: {
    title: 'Jenderal',
    description: 'Ringkasan nasional, kelola PIC & MC',
    icon: Crown,
  },
  pic: {
    title: 'PIC Wilayah',
    description: 'Kelola MC dan anggota di wilayah Anda',
    icon: Network,
  },
  mc: {
    title: 'MC Koordinator',
    description: 'Kelola maks. 10 anggota & bagikan link',
    icon: Users,
  },
};

const ROLE_ORDER: Role[] = ['jenderal', 'pic', 'mc'];

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const error = err as { message?: string; data?: { message?: string } };
    return error.data?.message ?? error.message ?? 'Terjadi kesalahan. Silakan coba lagi.';
  }

  return 'Terjadi kesalahan. Silakan coba lagi.';
}

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState(SHOW_DEMO ? DEMO_IDENTIFIER : '');
  const [password, setPassword] = useState(SHOW_DEMO ? DEMO_PASSWORD : '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mode "Lupa kata sandi"
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');

  const openForgot = () => {
    setMode('forgot');
    setErrorMsg(null);
    setForgotMessage('');
    setForgotPhone(identifier.includes('@') ? '' : identifier.trim());
  };

  const handleForgot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotLoading(true);
    setErrorMsg(null);

    try {
      const res = (await api.forgotPassword(forgotPhone.trim())) as { message?: string };
      setForgotMessage(res.message ?? 'Permintaan reset sudah dikirim ke atasan Anda.');
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = (await api.login({
        identifier: identifier.trim(),
        password,
      })) as LoginResponse;

      if (!res.success) {
        throw new Error(res.message || 'Login gagal.');
      }

      // Mendukung response dengan atau tanpa pembungkus "data".
      const authData: AuthData | undefined =
        res.data ?? (res.token ? { token: res.token, role: res.role, user: res.user } : undefined);

      const authenticatedRole = authData?.role ?? authData?.user?.role;

      if (!authData?.token || !authenticatedRole || !STAFF_ROLES.includes(authenticatedRole)) {
        throw new Error('Data autentikasi tidak valid atau role tidak sesuai.');
      }

      setStoredAuth(authData);
      window.dispatchEvent(new Event('paslon-auth-change'));
      router.replace(getRoleHome(authenticatedRole));
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center py-8 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:min-h-[600px] lg:grid-cols-2">
        {/* Panel identitas aplikasi (layar lebar) */}
        <div className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-[#0d5c4d] p-10 text-white lg:flex">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/5"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/5"
            aria-hidden
          />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold">Sistem Pemenangan</p>
              <p className="text-xs text-emerald-100/80">Pendataan Pendukung Berjenjang</p>
            </div>
          </div>

          <div className="relative space-y-6">
            <div>
              <h2 className="text-3xl font-bold leading-tight">
                Satu sistem untuk seluruh struktur tim.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                Dari Jenderal hingga MC di lapangan, setiap anggota terdata rapi
                sesuai wilayah dan koordinatornya.
              </p>
            </div>

            <ul className="space-y-3">
              {ROLE_ORDER.map((key) => {
                const item = ROLE_CONFIGS[key];
                const Icon = item.icon;
                return (
                  <li key={key} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
                    <Icon className="h-5 w-5 shrink-0 text-emerald-200" />
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-emerald-100/75">{item.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="relative text-xs text-emerald-100/60">
            Data anggota dijaga kerahasiaannya dan hanya dapat diakses sesuai peran.
          </p>
        </div>

        {/* Form login */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d5c4d] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Sistem Pemenangan</p>
              <p className="text-xs text-slate-500">Pendataan Pendukung Berjenjang</p>
            </div>
          </div>

          {mode === 'login' ? (
          <>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Masuk ke akun Anda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan email (Jenderal) atau nomor WhatsApp (PIC &amp; MC) yang terdaftar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Email atau Nomor WhatsApp
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  placeholder="Masukkan Email atau No WhatsApp.."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0d5c4d] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={openForgot}
                  className="text-xs font-semibold text-[#0d5c4d] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#0d5c4d] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] py-3 text-sm font-semibold text-white transition hover:bg-[#09483c] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
          </>
          ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke halaman masuk
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lupa kata sandi?</h1>
            <p className="mt-1 text-sm text-slate-500">
              Masukkan nomor WhatsApp akun Anda. Permintaan reset akan diteruskan ke atasan Anda
              (PIC ke Jenderal, MC ke PIC), lalu mereka mengirimkan kata sandi sementara.
            </p>

            {forgotMessage ? (
              <div className="mt-8 space-y-5">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{forgotMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] py-3 text-sm font-semibold text-white transition hover:bg-[#09483c]"
                >
                  Kembali ke halaman masuk
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="mt-8 space-y-5">
                <div>
                  <label htmlFor="forgot-phone" className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="forgot-phone"
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="08xxxxxxxxxx"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#0d5c4d] focus:bg-white"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0d5c4d] py-3 text-sm font-semibold text-white transition hover:bg-[#09483c] disabled:opacity-60"
                >
                  {forgotLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  {forgotLoading ? 'Mengirim...' : 'Kirim Permintaan Reset'}
                </button>

                <p className="text-center text-xs text-slate-400">
                  Akun Jenderal? Hubungi admin sistem untuk mereset kata sandi.
                </p>
              </form>
            )}
          </>
          )}
        </div>
      </div>
    </div>
  );
}
