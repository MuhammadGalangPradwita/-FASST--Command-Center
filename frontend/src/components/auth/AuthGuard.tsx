
'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getRoleHome, type UserRole } from '@/lib/permissions';

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: string;
}

interface StoredAuth {
  token?: string;
  role?: UserRole;
  user?: {
    role?: UserRole;
  };
}

const AUTH_KEY = 'paslon_auth';

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', callback);
  window.addEventListener('paslon-auth-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('paslon-auth-change', callback);
  };
}

function getSnapshot(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem(AUTH_KEY);
}

function getServerSnapshot(): null {
  return null;
}

function parseAuth(rawAuth: string | null): StoredAuth | null {
  if (!rawAuth) {
    return null;
  }

  try {
    return JSON.parse(rawAuth) as StoredAuth;
  } catch {
    return null;
  }
}

export default function AuthGuard({
  children,
  allowedRoles,
  fallback = '/',
}: AuthGuardProps) {
  const router = useRouter();

  const rawAuth = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const auth = parseAuth(rawAuth);
  const role = auth?.role ?? auth?.user?.role;

  const isAuthorized =
    Boolean(auth?.token) &&
    Boolean(role) &&
    allowedRoles.includes(role as UserRole);

  const isAuthenticated = Boolean(auth?.token && role);

  if (rawAuth === null) {
    // Snapshot null juga dapat berarti halaman sedang dirender di server.
    // Tampilkan loading sampai snapshot browser tersedia.
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">
          Memeriksa autentikasi...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Redirect
        to={fallback}
        router={router}
      />
    );
  }

  if (!isAuthorized && role) {
    return (
      <Redirect
        to={getRoleHome(role)}
        router={router}
      />
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

function Redirect({
  to,
  router,
}: {
  to: string;
  router: ReturnType<typeof useRouter>;
}) {
  // Navigasi dilakukan melalui event handler, bukan saat render.
  const handleRedirect = () => {
    router.replace(to);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        type="button"
        onClick={handleRedirect}
        className="text-sm text-slate-500"
      >
        Akses tidak tersedia. Lanjutkan
      </button>
    </div>
  );
}
