// src/state/session.ts — who is signed in.
// Tokens live in lib/tokens.ts. The signed-in user's profile is cached so the app opens instantly,
// then the session is re-checked with the server in the background.
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, SignInResult, authMode, signOutRemote } from '../lib/auth';
import { PATHS, api, refreshAccess, setAuthFailedHandler } from '../lib/api';
import { clearTokens, loadTokens, saveTokens } from '../lib/tokens';
import { clearHistory } from './history';
import { resetLive } from './liveData';

type Status = 'loading' | 'in' | 'out';
type State = { status: Status; user: AuthUser | null; email: string | null };

const K_USER = 'auth.user';
let state: State = { status: 'loading', user: null, email: null };
const subs = new Set<() => void>();
const set = (n: State) => { state = n; subs.forEach((f) => f()); };
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const getSnapshot = () => state;

const readUser = async (): Promise<AuthUser | null> => { try { const r = await SecureStore.getItemAsync(K_USER); return r ? JSON.parse(r) : null; } catch { return null; } };
const writeUser = (u: AuthUser | null) => { try { u ? SecureStore.setItemAsync(K_USER, JSON.stringify(u)).catch(() => {}) : SecureStore.deleteItemAsync(K_USER).catch(() => {}); } catch { /* ignore */ } };

async function localSignOut() {
  await clearTokens(); writeUser(null); clearHistory(); resetLive();
  set({ status: 'out', user: null, email: null });
}
setAuthFailedHandler(() => { localSignOut(); });

/** Call once at app start. */
export async function hydrateSession() {
  if (authMode === 'bypass') {
    const u = await readUser();
    set(u ? { status: 'in', user: u, email: u.email } : { status: 'out', user: null, email: null });
    return;
  }
  const { refresh } = await loadTokens();
  const cached = await readUser();
  if (!refresh || !cached) { set({ status: 'out', user: null, email: null }); return; }

  set({ status: 'in', user: cached, email: cached.email }); // open instantly with the cached profile...
  try {                                                      // ...then confirm with the server
    const ok = await refreshAccess();
    if (!ok) { await localSignOut(); return; }
    const me = await api<{ user: AuthUser }>(PATHS.me);
    if (me?.user) { writeUser(me.user); set({ status: 'in', user: me.user, email: me.user.email }); }
  } catch { /* offline: stay signed in with the cached profile */ }
}

export async function startSession(res: SignInResult, persist: boolean) {
  if (authMode === 'remote') await saveTokens(res.accessToken, res.refreshToken, persist);
  writeUser(persist ? res.user : null);
  resetLive(); // reconnect the live socket with the new token
  set({ status: 'in', user: res.user, email: res.user.email });
}

export async function endSession() {
  await signOutRemote();
  await localSignOut();
}

export function useSession(): State {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}