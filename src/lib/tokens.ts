// src/lib/tokens.ts — access + refresh token storage.
// SecureStore on the phone (Keychain / Keystore). On web SecureStore doesn't exist, so tokens stay in memory only.
import * as SecureStore from 'expo-secure-store';

const K_ACCESS = 'auth.access';
const K_REFRESH = 'auth.refresh';

let access: string | null = null;
let refresh: string | null = null;
let persisted = false;

export const getAccessToken = () => access;
export const getRefreshToken = () => refresh;
export const isPersisted = () => persisted;

export async function saveTokens(a: string, r: string, persist: boolean) {
  access = a; refresh = r; persisted = persist;
  if (!persist) return;
  try { await SecureStore.setItemAsync(K_ACCESS, a); await SecureStore.setItemAsync(K_REFRESH, r); } catch { /* memory only */ }
}

export async function loadTokens() {
  try { access = await SecureStore.getItemAsync(K_ACCESS); refresh = await SecureStore.getItemAsync(K_REFRESH); } catch { /* none */ }
  persisted = !!refresh;
  return { access, refresh };
}

export async function clearTokens() {
  access = null; refresh = null; persisted = false;
  for (const k of [K_ACCESS, K_REFRESH]) { try { await SecureStore.deleteItemAsync(k); } catch { /* ignore */ } }
}