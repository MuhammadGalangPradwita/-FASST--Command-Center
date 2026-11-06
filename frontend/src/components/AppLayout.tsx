'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { api, getStoredAuth, setStoredAuth } from '@/lib/api';
import { useStoredAuth } from '@/lib/useStoredAuth';
import NavbarHeader from '@/components/NavbarHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const auth = useStoredAuth();

  // Login dengan kata sandi sementara: wajib membuat kata sandi baru dulu
  const mustChangePassword = Boolean(auth?.token && auth.user?.must_change_password);

  const handlePasswordChanged = () => {
    const stored = getStoredAuth();
    if (stored?.user) {
      setStoredAuth({ ...stored, user: { ...stored.user, must_change_password: false } });
      window.dispatchEvent(new Event('paslon-auth-change'));
    }
    setChangePasswordOpen(false);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setStoredAuth(null);
    window.dispatchEvent(new Event('paslon-auth-change'));
    router.push('/login');
  };

  // Halaman yang tidak menampilkan sidebar dan navbar
  const hideNavigation =
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/daftar/');

  if (hideNavigation) {
    // body memakai overflow-hidden, jadi halaman ini perlu area scroll sendiri
    return (
      <main className="h-full w-full overflow-y-auto bg-[#f4f5f7] px-4 text-slate-900">
        {children}
      </main>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Sidebar tetap di layar lebar */}
      <div className="hidden md:flex">
        <Sidebar onChangePassword={() => setChangePasswordOpen(true)} />
      </div>

      {/* Sidebar sebagai laci di layar kecil */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div className="relative h-full shadow-xl">
            <Sidebar
              onNavigate={() => setMobileMenuOpen(false)}
              onChangePassword={() => setChangePasswordOpen(true)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f5f7]">
        <NavbarHeader onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f5f7] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {(mustChangePassword || changePasswordOpen) && (
        <ChangePasswordModal
          forced={mustChangePassword}
          onClose={() => setChangePasswordOpen(false)}
          onSuccess={handlePasswordChanged}
          onLogout={() => void handleLogout()}
        />
      )}
    </div>
  );
}
