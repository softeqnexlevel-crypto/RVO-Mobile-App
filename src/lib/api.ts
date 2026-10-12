// src/lib/api.ts — one place for every call to your backend.
//  - attaches "Authorization: Bearer <accessToken>"
//  - on 401, refreshes the token ONCE (refresh tokens rotate, so concurrent calls share one refresh) and retries
//  - if the refresh is rejected, signs the user out
import { clearTokens, getAccessToken, getRefreshToken, isPersisted, saveTokens } from './tokens';


const RENDER_API_URL = 'https://aquawatchbackend.onrender.com';
const LOCAL_API_URL = 'http://192.168.100.6:4000';

export const API = (
  process.env.EXPO_PUBLIC_API_URL || RENDER_API_URL
).replace(/\/+$/, '');


// export const API = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') || LOCAL_API_URL;

// TODO: confirm these against routes/auth.routes.js and how server.js mounts them.
export const PATHS = {
  login: '/api/auth/login',
  refresh: '/api/auth/refresh',
  logout: '/api/auth/logout',
  me: '/api/auth/me',
  changePassword: '/api/auth/change-password',
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

type Opts = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; auth?: boolean; timeoutMs?: number };

async function raw<T>(path: string, { method = 'GET', body, auth = true, timeoutMs = 15_000 }: Opts): Promise<T> {
  if (!API) throw new Error('EXPO_PUBLIC_API_URL is not set');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getAccessToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await fetch(`${API}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    } catch {
      throw new Error("Can't reach the server. Check your connection and try again.");
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError((json && (json.error || json.message)) || `Request failed (${res.status})`, res.status);
    return json as T;
  } finally { clearTimeout(timer); }
}

let onAuthFailed: () => void = () => {};
export const setAuthFailedHandler = (fn: () => void) => { onAuthFailed = fn; };

let refreshing: Promise<boolean> | null = null;
/** true = new tokens saved, false = server rejected the refresh token. Throws on network errors (user stays signed in). */
export function refreshAccess(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const r = await raw<{ accessToken: string; refreshToken: string }>(PATHS.refresh, { method: 'POST', body: { refreshToken: rt }, auth: false });
      await saveTokens(r.accessToken, r.refreshToken, isPersisted());
      return true;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 401)) return false;
      throw e;
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  try {
    return await raw<T>(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && opts.auth !== false && getRefreshToken()) {
      let ok = false;
      try { ok = await refreshAccess(); } catch { throw e; }
      if (ok) return raw<T>(path, opts);
      await clearTokens();
      onAuthFailed();
    }
    throw e;
  }
}