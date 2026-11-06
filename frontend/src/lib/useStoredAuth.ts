'use client';

import { useSyncExternalStore } from 'react';

export type StoredRole = 'jenderal' | 'pic' | 'mc' | 'anggota';

export interface StoredAuthState {
  role?: StoredRole;
  user?: {
    id?: number | string;
    nama?: string;
    must_change_password?: boolean;
  };
  token?: string;
}

const AUTH_KEY = 'paslon_auth';

const subscribe = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', callback);
  window.addEventListener('paslon-auth-change', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('paslon-auth-change', callback);
  };
};

const getSnapshot = (): string | null =>
  typeof window === 'undefined' ? null : localStorage.getItem(AUTH_KEY);

const getServerSnapshot = (): null => null;

/**
 * Sesi login yang tersimpan di browser, ikut berubah saat login/logout/ganti password.
 */
export function useStoredAuth(): StoredAuthState | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuthState;
  } catch {
    return null;
  }
}
