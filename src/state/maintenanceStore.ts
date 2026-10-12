// src/state/maintenanceStore.ts
// Service schedule + log. Saved on the phone (SecureStore; memory only on web).
// TODO: intervals are placeholders; set them from your service manual, or move this to your backend.
import { useEffect, useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

export type Task = { id: string; title: string; intervalDays: number };
export const TASKS: Task[] = [
  { id: 'cip', title: 'Membrane cleaning (CIP)', intervalDays: 90 },
  { id: 'cart', title: 'Replace cartridge filters', intervalDays: 30 },
  { id: 'cal', title: 'Calibrate pressure transmitter', intervalDays: 180 },
  { id: 'dose', title: 'Dosing pump service', intervalDays: 60 },
];

type State = { last: Record<string, number>; log: { id: string; at: number }[]; ready: boolean };
const KEY = 'maintenance.v1';
const DAY = 86_400_000;
let state: State = { last: {}, log: [], ready: false };
const subs = new Set<() => void>();
const set = (n: State) => { state = n; subs.forEach((f) => f()); };
const save = () => SecureStore.setItemAsync(KEY, JSON.stringify({ last: state.last, log: state.log.slice(0, 12) })).catch(() => {});

export async function hydrateMaintenance() {
  let saved: Partial<State> = {};
  try { const raw = await SecureStore.getItemAsync(KEY); if (raw) saved = JSON.parse(raw); } catch {}
  const now = Date.now();
  const last = { ...(saved.last ?? {}) };
  TASKS.forEach((t) => { if (last[t.id] === undefined) last[t.id] = now; }); // first run: schedule starts today
  set({ last, log: saved.log ?? [], ready: true });
  save();
}

export function logService(id: string) {
  const at = Date.now();
  set({ ...state, last: { ...state.last, [id]: at }, log: [{ id, at }, ...state.log].slice(0, 12) });
  save();
}

export type TaskStatus = { key: 'overdue' | 'soon' | 'scheduled' | 'ok'; label: string; color: string; text: string; days: number };
export function taskStatus(t: Task, last: number, now = Date.now()): TaskStatus {
  const days = Math.ceil((last + t.intervalDays * DAY - now) / DAY);
  if (days < 0) return { key: 'overdue', label: 'Overdue', color: '#ef4444', text: `Was due ${-days} day${-days === 1 ? '' : 's'} ago`, days };
  if (days <= 7) return { key: 'soon', label: 'Due soon', color: '#f59e0b', text: days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`, days };
  if (days <= 30) return { key: 'scheduled', label: 'Scheduled', color: '#0ea5e9', text: `Next due in ${days} days`, days };
  return { key: 'ok', label: 'On track', color: '#22c55e', text: `Next due in ${days} days`, days };
}

export function useMaintenance() {
  const s = useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => state, () => state);
  useEffect(() => { if (!s.ready) hydrateMaintenance(); }, [s.ready]);
  const tasks = TASKS.map((t) => ({ ...t, status: taskStatus(t, s.last[t.id] ?? Date.now()) })).sort((a, b) => a.status.days - b.status.days);
  return { tasks, log: s.log, overdue: tasks.filter((t) => t.status.key === 'overdue').length, ready: s.ready };
}