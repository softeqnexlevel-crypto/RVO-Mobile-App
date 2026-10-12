// src/state/useProductionTotals.ts
// Real production totals from the SAME endpoint the website uses:
//   GET {API}/api/production-summary   (Bearer token, attached by lib/api)
//   -> { permeate: { daily, weekly, monthly, yearly }, feed: { daily } }
// One shared store: every screen that calls the hook reuses one 60 s poll.
import { useSyncExternalStore } from 'react';
import { api } from '../lib/api';

export type Totals = {
  permeate: { daily: number | null; weekly: number | null; monthly: number | null; yearly: number | null };
  feedDaily: number | null;
};

type State = { data: Totals | null; loading: boolean; error: string | null; updatedAt: number | null };

const POLL_MS = 60_000;
let state: State = { data: null, loading: true, error: null, updatedAt: null };
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let inflight = false;

const emit = (n: State) => { state = n; subs.forEach((f) => f()); };
const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function refreshProductionTotals() {
  if (inflight) return;
  inflight = true;
  try {
    const r = await api<any>('/api/production-summary', { timeoutMs: 10_000 });
    emit({
      data: {
        permeate: {
          daily: toNum(r?.permeate?.daily),
          weekly: toNum(r?.permeate?.weekly),
          monthly: toNum(r?.permeate?.monthly),
          yearly: toNum(r?.permeate?.yearly),
        },
        feedDaily: toNum(r?.feed?.daily),
      },
      loading: false,
      error: null,
      updatedAt: Date.now(),
    });
  } catch (e) {
    // Keep the last good totals on screen; just flag the error.
    emit({ ...state, loading: false, error: e instanceof Error ? e.message : 'Failed to load totals' });
  } finally {
    inflight = false;
  }
}

function subscribe(cb: () => void) {
  subs.add(cb);
  if (subs.size === 1) {
    refreshProductionTotals();
    timer = setInterval(refreshProductionTotals, POLL_MS);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && timer) { clearInterval(timer); timer = null; }
  };
}

/** Call on sign-out so the next user never sees the previous user's totals. */
export function resetProductionTotals() {
  emit({ data: null, loading: true, error: null, updatedAt: null });
}

const getSnapshot = () => state;

export function useProductionTotals() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...s, refresh: refreshProductionTotals };
}