'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  History,
  LogOut,
  KeyRound,
  ShieldCheck,
  Network,
  type LucideIcon,
} from 'lucide-react';

import { api, setStoredAuth } from '@/lib/api';
import { useStoredAuth } from '@/lib/useStoredAuth';

type UserRole = 'jenderal' | 'pic' | 'mc' | 'anggota';


interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
}


const menuItems: MenuItem[] = [
  { href: '/dashboard/jenderal', label: 'Dashboard', icon: LayoutDashboard, roles: ['jenderal'] },
  { href: '/dashboard/pic', label: 'Dashboard', icon: LayoutDashboard, roles: ['pic'] },
  { href: '/dashboard/mc', label: 'Dashboard', icon: LayoutDashboard, roles: ['mc'] },
  { href: '/pic', label: 'PIC', icon: Network, roles: ['jenderal'] },
  { href: '/mc', label: 'MC', icon: Users, roles: ['jenderal', 'pic'] },
  { href: '/anggota', label: 'Anggota', icon: UserCheck, roles: ['jenderal', 'mc', 'pic'] },
  { href: '/audit', label: 'Audit Trail', icon: History, roles: ['jenderal'] },
];

const ROLE_META: Record<UserRole, { label: string; panel: string; avatar: string }> = {
  jenderal: { label: 'Jenderal', panel: 'Panel Jenderal', avatar: 'bg-orange-500' },
  pic: { label: 'PIC Wilayah', panel: 'Panel PIC', avatar: 'bg-blue-600' },
  mc: { label: 'MC Koordinator', panel: 'Panel MC', avatar: 'bg-[#0d5c4d]' },
  anggota: { label: 'Anggota', panel: 'Panel Anggota', avatar: 'bg-slate-600' },
};

export function SidebarBrand({ role }: { role?: UserRole }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d5c4d] text-white">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-slate-900">Sistem Pemenangan</p>
        <p className="truncate text-[11px] text-slate-500">
          {role ? ROLE_META[role].panel : 'Pendataan Pendukung'}
        </p>
      </div>
    </div>
  );
}

interface SidebarProps {
  /** Dipanggil saat menu diklik (menutup laci sidebar di layar kecil). */
  onNavigate?: () => void;
  /** Membuka modal ganti kata sandi. */
  onChangePassword?: () => void;
}

export default function Sidebar({ onNavigate, onChangePassword }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useStoredAuth();

  const role: UserRole = auth?.role ?? 'jenderal';
  const meta = ROLE_META[role];
  const visibleItems = menuItems.filter((item) => item.roles.includes(role));

  // Menu aktif = href terpanjang yang cocok dengan URL saat ini
  const activeHref = visibleItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const handleLogout = async () => {
    // Cabut token di server; sesi lokal tetap dihapus walau request gagal.
    await api.logout().catch(() => undefined);

    setStoredAuth(null);
    window.dispatchEvent(new Event('paslon-auth-change'));
    onNavigate?.();
    router.push('/login');
  };

  const nama = auth?.user?.nama ?? '-';

  return (
    <aside className="flex h-full w-64 shrink-0 select-none flex-col border-r border-slate-200/80 bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5">
        <SidebarBrand role={role} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <span className="mb-2 block px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Menu
        </span>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-emerald-50 font-semibold text-[#0d5c4d]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#0d5c4d]' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${meta.avatar}`}
          >
            {nama.trim().charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900" title={nama}>
              {nama}
            </p>
            <p className="truncate text-[11px] text-slate-500">{meta.label}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            onChangePassword?.();
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <KeyRound className="h-4 w-4" />
          Ganti Password
        </button>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
