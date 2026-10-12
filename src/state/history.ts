// src/state/history.ts
// Records live tag values on the phone so the Trends, Filtration, Recovery... charts have history
// without waiting for a backend. One point per 10 s, last 24 h, per tag. Lost when the app closes.
// TODO: swap for a server history API (and 7-day range) when it exists.
import { useSyncExternalStore } from 'react';
import { History, HistoryPoint } from '../lib/trendMath';

const STEP_MS = 4_000;          // ignore points closer together than this
const WINDOW_MS = 24 * 3_600_000; // keep the last 24 h

const store: Record<string, HistoryPoint[]> = {};
let snapshot: History = {};
const subs = new Set<() => void>();

export function record(tag: string, value: number, t = Date.now()) {
  const a = (store[tag] ??= []);
  const last = a[a.length - 1];
  if (last && t - Number(last.time) < STEP_MS) return;
  a.push({ time: t, value });
  while (a.length && t - Number(a[0].time) > WINDOW_MS) a.shift();
}

export function clearHistory() { for (const k of Object.keys(store)) delete store[k]; publish(); }
export const pointCount = () => Object.values(store).reduce((n, a) => n + a.length, 0);

export function publish() {
  snapshot = { ...store }; // new object each tick so memoised consumers recompute
  subs.forEach((f) => f());
}

const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const getSnapshot = () => snapshot;

export function useRecordedHistory(): History {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}