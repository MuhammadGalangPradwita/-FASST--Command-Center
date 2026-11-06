
// Default '/api' diteruskan Next.js ke Laravel (lihat rewrites di next.config.ts)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface AuthUser {
  id?: number | string;
  [key: string]: unknown;
}

interface StoredAuth {
  role?: string;
  user?: AuthUser;
  token?: string;
  [key: string]: unknown;
}

interface ApiError extends Error {
  data?: Record<string, unknown>;
  status?: number;
}

interface LoginPayload {
  /** Opsional: peran dideteksi otomatis oleh server. */
  role?: string;
  identifier: string;
  password: string;
}

interface MemberPayload {
  nama?: string;
  nik?: string;
  no_hp?: string;
  created_by?: 'self' | 'mc';
  [key: string]: unknown;
}

interface PicPayload {
  nama: string;
  no_hp: string;
  wilayah: string;
  password: string;
}

interface McPayload {
  nama: string;
  no_hp: string;
}

interface AuditLogParams {
  user_type?: string;
  action?: string;
  search?: string;
  auth_role?: string;
  auth_user_id?: number;
  page?: number;
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('paslon_auth');

    if (!raw) return null;

    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth | null): void {
  if (typeof window === 'undefined') return;

  if (!auth) {
    localStorage.removeItem('paslon_auth');
  } else {
    localStorage.setItem('paslon_auth', JSON.stringify(auth));
  }
}

export async function fetchApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const auth = getStoredAuth();

  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Accept', 'application/json');

  if (auth?.role) {
    headers.set('X-User-Role', auth.role);
  }

  if (auth?.user?.id) {
    headers.set('X-User-Id', String(auth.user.id));
  }

  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorData =
      typeof data === 'object' && data !== null
        ? (data as Record<string, unknown>)
        : {};

    const errorMsg =
      typeof errorData.message === 'string'
        ? errorData.message
        : `API Error: ${res.status} ${res.statusText}`;

    const err: ApiError = new Error(errorMsg);
    err.data = errorData;
    err.status = res.status;

    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  login: (data: LoginPayload) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => fetchApi('/auth/logout', { method: 'POST' }),

  changePassword: (payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) =>
    fetchApi('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  forgotPassword: (identifier: string) =>
    fetchApi('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  // Reset password oleh atasan (menghasilkan kata sandi sementara)
  resetPicPassword: (picId: number) =>
    fetchApi(`/jenderal/pics/${picId}/reset-password`, { method: 'POST' }),

  resetMcPasswordByJenderal: (mcId: number) =>
    fetchApi(`/jenderal/mcs/${mcId}/reset-password`, { method: 'POST' }),

  resetMcPasswordByPic: (picId: number, mcId: number) =>
    fetchApi(`/pic/${picId}/mcs/${mcId}/reset-password`, { method: 'POST' }),


  // Link Pendaftaran MC & Self-Registration
  checkRegistrationLink: (token: string) =>
    fetchApi(`/registration-link/${encodeURIComponent(token)}`),

  registerMember: (payload: MemberPayload) =>
    fetchApi('/register-member', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Jenderal Command Center & User Management CRUD
  getJenderalDashboard: () => fetchApi('/jenderal/dashboard'),

  getPics: () => fetchApi('/pics'),

  createPic: (data: PicPayload) =>
    fetchApi('/jenderal/pics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePic: (id: number, payload: Omit<PicPayload, 'password'>) =>
    fetchApi(`/jenderal/pics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deletePic: (id: number) =>
    fetchApi(`/jenderal/pics/${id}`, { method: 'DELETE' }),

  getAllUsers: () => fetchApi('/jenderal/all-users'),

  getMcs: () => fetchApi('/mcs'),

  getAnggotas: (params?: { search?: string; source?: string; page?: number }) => {
    const qs = new URLSearchParams();

    if (params?.search) qs.append('search', params.search);
    if (params?.source) qs.append('source', params.source);
    if (params?.page) qs.append('page', String(params.page));

    const query = qs.toString();

    return fetchApi(`/anggotas${query ? `?${query}` : ''}`);
  },

  updateMcByJenderal: (
    id: number,
    payload: { nama: string; no_hp: string; pic_id: number },
  ) =>
    fetchApi(`/jenderal/mcs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteMc: (id: number) =>
    fetchApi(`/jenderal/mcs/${id}`, { method: 'DELETE' }),

  // PIC Regional & MC Management
  getPicDashboard: (id: number) =>
    fetchApi(`/pic/${id}/dashboard`),

  createMc: (picId: number, payload: McPayload) =>
    fetchApi(`/pic/${picId}/mcs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMc: (picId: number, mcId: number, payload: McPayload) =>
    fetchApi(`/pic/${picId}/mcs/${mcId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getRegionalAnggotas: (picId: number) =>
    fetchApi(`/pic/${picId}/anggotas`),

  // MC Field Officer & Group Members
  getMcDashboard: (id: number) =>
    fetchApi(`/mc/${id}/dashboard`),

  addMemberByMc: (mcId: number, payload: MemberPayload) =>
    fetchApi(`/mc/${mcId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMemberByMc: (
    mcId: number,
    memberId: number,
    payload: MemberPayload,
  ) =>
    fetchApi(`/mc/${mcId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteMemberByMc: (mcId: number, memberId: number) =>
    fetchApi(`/mc/${mcId}/members/${memberId}`, {
      method: 'DELETE',
    }),

  // Audit Logs (RBAC Scoped)
  getAuditLogs: (params?: AuditLogParams) => {
    const qs = new URLSearchParams();

    if (params?.user_type) qs.append('user_type', params.user_type);
    if (params?.action) qs.append('action', params.action);
    if (params?.search) qs.append('search', params.search);
    if (params?.auth_role) qs.append('auth_role', params.auth_role);

    if (params?.auth_user_id !== undefined) {
      qs.append('auth_user_id', String(params.auth_user_id));
    }

    if (params?.page) qs.append('page', String(params.page));

    const query = qs.toString();

    return fetchApi(`/audit-logs${query ? `?${query}` : ''}`);
  },
};
