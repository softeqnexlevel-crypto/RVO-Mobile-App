// src/lib/auth.ts
// Modes (EXPO_PUBLIC_AUTH_MODE):
//   remote  real sign-in against your backend      (default whenever EXPO_PUBLIC_API_URL is set)
//   bypass  demo: any email/password gets in       (only if you set it explicitly. NEVER ship)
import { API, PATHS, api } from './api';
import { getAccessToken, getRefreshToken } from './tokens';

export type Role = 'admin' | 'operator' | 'client';
export type AuthUser = { id: string; email: string; firstName?: string; lastName?: string; role: Role; permissions: string[]; phone?: string; isActive?: boolean };
export type SignInResult = { user: AuthUser; accessToken: string; refreshToken: string };

export const authMode: 'remote' | 'bypass' = (process.env.EXPO_PUBLIC_AUTH_MODE as any) === 'bypass' || !API ? 'bypass' : 'remote';
export const isAuthBypassed = authMode === 'bypass';

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (authMode === 'bypass') {
    await new Promise((r) => setTimeout(r, 400));
    return { user: { id: 'demo', email, firstName: 'Demo', lastName: 'User', role: 'admin', permissions: [] }, accessToken: '', refreshToken: '' };
  }
  const r = await api<{ user: AuthUser; accessToken: string; refreshToken: string }>(PATHS.login, { method: 'POST', body: { email, password }, auth: false });
  return { user: r.user, accessToken: r.accessToken, refreshToken: r.refreshToken };
}

/** Best effort: tells the server to revoke this device's refresh token. Never blocks sign-out. */
export async function signOutRemote() {
  if (authMode === 'bypass') return;
  const rt = getRefreshToken();
  if (!rt || !getAccessToken()) return;
  try { await api(PATHS.logout, { method: 'POST', body: { refreshToken: rt }, timeoutMs: 5000 }); } catch { /* offline: still sign out locally */ }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await api(PATHS.changePassword, { method: 'POST', body: { currentPassword, newPassword } });
}

export const canOperate = (role?: Role | string | null) => role === 'admin' || role === 'operator';
export const isAdmin = (role?: Role | string | null) => role === 'admin';