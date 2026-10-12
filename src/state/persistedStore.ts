// src/state/persistedStore.ts  — tiny persisted store (SecureStore on device, memory only on web).
// `use()` is a single useSyncExternalStore on purpose: no effects, so the hook list never changes shape.
// Loading from storage happens once, when the module is first imported.
import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

export function createStore<T extends object>(key: string, initial: T) {
  let state: T = initial;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
  const getSnapshot = () => state;

  async function hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(key);
      if (raw) { state = { ...initial, ...JSON.parse(raw) }; emit(); }
    } catch { /* storage unavailable (e.g. web): keep defaults */ }
  }

  function set(patch: Partial<T>) {
    state = { ...state, ...patch };
    emit();
    try { SecureStore.setItemAsync(key, JSON.stringify(state)).catch(() => {}); } catch { /* ignore */ }
  }

  // Named useStore (not `use`) so Fast Refresh recognises it as a hook.
  function useStore(): T {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  }

  hydrate();
  return { useStore, set, get: getSnapshot };
}