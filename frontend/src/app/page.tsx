'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, ArrowRight, AlertTriangle, Sparkles, Info } from 'lucide-react';
import { api, setStoredAuth } from '@/lib/api';

/* ------------------------------------------------------------------ */
/* Types & konfigurasi                                                 */
/* ------------------------------------------------------------------ */

type Role = 'jenderal' | 'pic' | 'mc';

// Panel demo & autofill hanya aktif jika flag ini true.
// Set NEXT_PUBLIC_SHOW_DEMO=true di .env.local (JANGAN di production).
const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO === 'true';
const DEMO_PASSWORD = 'password123';

interface RoleConfig {
  title: string;
  level: string;
  tabLabel: string;
  defaultIdentifier: string;
  placeholder: string;
  idLabel: string;
  redirect: string;
  badgeColor: string;
}

const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  jenderal: {
    title: 'Jenderal Kemenangan',
    level: 'Super Admin',
    tabLabel: '👑 Jenderal',
    defaultIdentifier: 'jenderal@kemenangan.id',
    placeholder: 'jenderal@kemenangan.id',
    idLabel: 'Alamat Email',
    redirect: '/dashboard/jenderal',
    badgeColor: 'bg-emerald-50 text-[#0d5c4d] border-emerald-200',
  },
  pic: {
    title: 'Koordinator Wilayah (PIC)',
    level: 'Level 1 Admin',
    tabLabel: '🏛️ PIC',
    defaultIdentifier: '081234567891',
    placeholder: '081234567891 (No. WhatsApp)',
    idLabel: 'Nomor WhatsApp PIC',
    redirect: '/dashboard/pic',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  mc: {
    title: 'Koordinator Anggota (MC)',
    level: 'Field Officer',
    tabLabel: '👥 MC',
    defaultIdentifier: '081234567801',
    placeholder: '081234567801 (No. WhatsApp)',
    idLabel: 'Nomor WhatsApp MC',
    redirect: '/dashboard/mc',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
};

const ROLE_ORDER: Role[] = ['jenderal', 'pic', 'mc'];

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    role: Role;
    user: {
      id: number;
      nama: string;
      must_change_password?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

interface DemoAccount {
  role: Role;
  identifier: string;
  badge: string;
  name: string;
  cta: string;
  card: string;
  badgeStyle: string;
  hoverText: string;
  divider: string;
  ctaText: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'jenderal',
    identifier: 'jenderal@kemenangan.id',
    badge: 'Super Admin',
    name: 'Jenderal Andika',
    cta: 'Masuk Command Center',
    card: 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50',
    badgeStyle: 'bg-emerald-100 text-[#0d5c4d]',
    hoverText: 'group-hover:text-[#0d5c4d]',
    divider: 'border-emerald-100',
    ctaText: 'text-[#0d5c4d]',
  },
  {
    role: 'pic',
    identifier: '081234567891',
    badge: 'PIC DKI Jakarta',
    name: 'H. Budi Santoso',
    cta: 'Masuk Rekap Wilayah',
    card: 'border-blue-200 bg-blue-50/40 hover:bg-blue-50',
    badgeStyle: 'bg-blue-100 text-blue-700',
    hoverText: 'group-hover:text-blue-700',
    divider: 'border-blue-100',
    ctaText: 'text-blue-700',
  },
  {
    role: 'pic',
    identifier: '081234567892',
    badge: 'PIC Jawa Barat',
    name: 'Drs. Asep Hidayat',
    cta: 'Masuk Rekap Wilayah',
    card: 'border-blue-200 bg-blue-50/40 hover:bg-blue-50',
    badgeStyle: 'bg-blue-100 text-blue-700',
    hoverText: 'group-hover:text-blue-700',
    divider: 'border-blue-100',
    ctaText: 'text-blue-700',
  },
  {
    role: 'mc',
    identifier: '081234567801',
    badge: 'MC Lapangan (7/10)',
    name: 'Ridwan Kamil (Cilandak)',
    cta: 'Masuk Kelompok MC',
    card: 'border-purple-200 bg-purple-50/40 hover:bg-purple-50',
    badgeStyle: 'bg-purple-100 text-purple-700',
    hoverText: 'group-hover:text-purple-700',
    divider: 'border-purple-100',
    ctaText: 'text-purple-700',
  },
];

const PERMISSION_ROWS: { module: string; cells: [string, string, string, string]; voterStyle?: string }[] = [
  {
    module: 'Manajemen Pengguna',
    cells: [
      'CRUD PIC; Read All MC & Anggota',
      'CRUD MC wilayah; Read Anggota wilayah',
      'CRUD max 10 Anggota kelompoknya',
      'Read & Update profil mandiri',
    ],
  },
  {
    module: 'Dashboard & Analytics',
    cells: [
      'Full Access Command Center',
      'Dashboard Rekapitulasi Wilayah',
      'Dashboard Progres 10 Anggota',
      'Link Grup WhatsApp Koordinasi',
    ],
  },
  {
    module: 'Audit Trail (Log)',
    cells: [
      'Read All Logs Nasional/Global',
      'Read Logs Wilayah Operasional',
      'Read Logs 10 Anggota Kelompok',
      'No Access (403 Forbidden)',
    ],
    voterStyle: 'text-rose-600 font-semibold',
  },
  {
    module: 'Link Pendaftaran',
    cells: [
      'Read & Manage Link Pendaftaran MC',
      'Read & Manage Link MC Wilayah',
      'Read & Share Link Pendaftaran Unik',
      'Form Pendaftaran Mandiri',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helper                                                              */
/* ------------------------------------------------------------------ */

function getErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const e = err as { data?: { message?: string }; message?: string };
    return e.data?.message ?? e.message ?? 'Terjadi kesalahan. Coba lagi.';
  }
  return 'Terjadi kesalahan. Coba lagi.';
}

/* ------------------------------------------------------------------ */
/* Komponen                                                            */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('jenderal');
  const [identifier, setIdentifier] = useState(SHOW_DEMO ? ROLE_CONFIGS.jenderal.defaultIdentifier : '');
  const [password, setPassword] = useState(SHOW_DEMO ? DEMO_PASSWORD : '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const config = ROLE_CONFIGS[role];

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setIdentifier(SHOW_DEMO ? ROLE_CONFIGS[newRole].defaultIdentifier : '');
    setErrorMsg(null);
  };

  // Satu fungsi login untuk form manual & quick login.
  
const performLogin = async (
  targetRole: Role,
  id: string,
  pass: string,
): Promise<void> => {
  if (loading) return;

  setLoading(true);
  setErrorMsg(null);

  try {
    const res = (await api.login({
      role: targetRole,
      identifier: id,
      password: pass,
    })) as LoginResponse;

    if (res.success && res.data) {
      setStoredAuth(res.data);
      window.dispatchEvent(new Event('paslon-auth-change'));
      // Peran ditentukan server dari akun yang cocok
      router.push(ROLE_CONFIGS[res.data.role]?.redirect ?? ROLE_CONFIGS[targetRole].redirect);
      return;
    }

    setErrorMsg(
      res.message ?? 'Login gagal. Periksa kembali data Anda.',
    );
  } catch (err: unknown) {
    setErrorMsg(getErrorMessage(err));
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(role, identifier, password);
  };

  const quickLogin = (targetRole: Role, id: string) => {
    setRole(targetRole);
    setIdentifier(id);
    setPassword(DEMO_PASSWORD);
    performLogin(targetRole, id, DEMO_PASSWORD);
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-6">

      {/* Quick login demo (hanya jika SHOW_DEMO) */}
      {SHOW_DEMO && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Quick Login Demo (Uji Coba Cepat RBAC)
            </h3>
            <p className="text-[11px] text-slate-500">
              Klik salah satu akun di bawah untuk langsung masuk dan beralih hak akses:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={`${acc.role}-${acc.identifier}`}
                type="button"
                disabled={loading}
                onClick={() => quickLogin(acc.role, acc.identifier)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between group disabled:opacity-60 ${acc.card}`}
              >
                <div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${acc.badgeStyle}`}>
                    {acc.badge}
                  </span>
                  <h4 className={`font-bold text-xs text-slate-900 mt-1.5 ${acc.hoverText}`}>{acc.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">{acc.identifier}</p>
                </div>
                <div
                  className={`mt-2 pt-2 border-t ${acc.divider} text-[10px] ${acc.ctaText} font-semibold flex items-center justify-between`}
                >
                  <span>{acc.cta}</span>
                  <span aria-hidden>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}