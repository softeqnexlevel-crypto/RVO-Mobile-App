// src/lib/analytics.ts — numbers for the Analytics screen, computed from recorded history.
import { Pt } from './trendMath';

const GAP_MS = 5 * 60_000; // don't count flow across gaps longer than this (app was closed / offline)

/** m³ produced = flow (m³/h) integrated over time. */
export function volumeM3(flow: Pt[]): number {
  let v = 0;
  for (let i = 0; i < flow.length - 1; i++) {
    const dt = flow[i + 1].t - flow[i].t;
    if (dt > 0 && dt <= GAP_MS) v += flow[i].v * (dt / 3_600_000);
  }
  return v;
}

export const mean = (p: Pt[]) => (p.length ? p.reduce((a, b) => a + b.v, 0) / p.length : null);

/** Share of recorded time the signal was ON (> 0.5). */
export function uptimePct(sig: Pt[]): number | null {
  let on = 0, total = 0;
  for (let i = 0; i < sig.length - 1; i++) {
    const dt = sig[i + 1].t - sig[i].t;
    if (dt <= 0 || dt > GAP_MS) continue;
    total += dt; if (sig[i].v > 0.5) on += dt;
  }
  return total ? (on / total) * 100 : null;
}

export function bucketize(p: Pt[], from: number, to: number, n: number, f: (b: Pt[], t0: number, t1: number) => number | null) {
  const w = (to - from) / n;
  return Array.from({ length: n }, (_, i) => {
    const t0 = from + i * w, t1 = t0 + w;
    return { t0, t1, v: f(p.filter((x) => x.t >= t0 && x.t < t1), t0, t1) };
  });
}

/** Minutes a 0/1 signal was ON inside [from, to). */
export function onMinutes(sig: Pt[], from: number, to: number): number {
  let ms = 0;
  for (let i = 0; i < sig.length - 1; i++) {
    const a = Math.max(sig[i].t, from), b = Math.min(sig[i + 1].t, to), dt = b - a;
    if (dt > 0 && sig[i + 1].t - sig[i].t <= GAP_MS && sig[i].v > 0.5) ms += dt;
  }
  return ms / 60_000;
}