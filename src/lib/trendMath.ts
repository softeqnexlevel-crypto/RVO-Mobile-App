// src/lib/trendMath.ts
export type HistoryPoint = { time: string | number | Date; value: number };
export type History = Record<string, HistoryPoint[]>;
export type Pt = { t: number; v: number };

export const RANGES = { '1h': 3_600_000, '6h': 21_600_000, '24h': 86_400_000, '7d': 604_800_000 } as const;
export type RangeKey = keyof typeof RANGES;

export function toPts(h?: HistoryPoint[]): Pt[] {
  if (!h) return [];
  return h
    .map((d) => ({ t: new Date(d.time).getTime(), v: Number(d.value) }))
    .filter((d) => Number.isFinite(d.t) && Number.isFinite(d.v))
    .sort((a, b) => a.t - b.t);
}

export function stats(values: number[]) {
  if (!values.length) return null;
  const n = values.length;
  const avg = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((a, b) => a + (b - avg) ** 2, 0) / n);
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { min: sorted[0], max: sorted[n - 1], avg, sd, median, n, current: values[n - 1] };
}

/** Evenly spaced "nice" axis ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / Math.max(1, count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** Monotone-X cubic path (same look as Recharts type="monotone"). */
export function monotonePath(p: { x: number; y: number }[]): string {
  const n = p.length;
  if (n === 0) return '';
  if (n === 1) return `M ${p[0].x} ${p[0].y}`;
  const dx: number[] = [], s: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1].x - p[i].x || 1e-6;
    s[i] = (p[i + 1].y - p[i].y) / dx[i];
  }
  t[0] = s[0];
  t[n - 1] = s[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / s[i], b = t[i + 1] / s[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * s[i]; t[i + 1] = k * b * s[i]; }
  }
  let d = `M ${p[0].x} ${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const w = dx[i] / 3;
    d += ` C ${p[i].x + w} ${p[i].y + t[i] * w} ${p[i + 1].x - w} ${p[i + 1].y - t[i + 1] * w} ${p[i + 1].x} ${p[i + 1].y}`;
  }
  return d;
}

/** Keep the SVG light: thin out very long series. */
export function decimate<T>(arr: T[], max = 500): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtClock = (t: number) => { const d = new Date(t); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
export const fmtClockSec = (t: number) => { const d = new Date(t); return `${fmtClock(t)}:${pad2(d.getSeconds())}`; };
export const fmtDay = (t: number) => { const d = new Date(t); return `${pad2(d.getDate())} ${MONTHS[d.getMonth()]}`; };

/** Enough decimals that neighbouring bin edges never print identically. */
export function precisionFor(binSize: number) {
  if (!isFinite(binSize) || binSize <= 0) return 2;
  return Math.min(Math.max(Math.ceil(-Math.log10(binSize)), 1), 6);
}

export type Bin = { start: number; end: number; count: number; label: string; range: string };
export function histogram(values: number[], bins: number): Bin[] {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values), range = max - min;
  if (range === 0) return [{ start: min, end: max, count: values.length, label: min.toFixed(2), range: min.toFixed(2) }];
  const n = Math.max(1, Math.min(bins, values.length));
  const size = range / n;
  const prec = precisionFor(size);
  const out: Bin[] = Array.from({ length: n }, (_, i) => {
    const start = min + i * size, end = min + (i + 1) * size;
    return { start, end, count: 0, label: start.toFixed(prec), range: `${start.toFixed(prec)}–${end.toFixed(prec)}` };
  });
  values.forEach((v) => { out[Math.min(Math.floor((v - min) / size), n - 1)].count++; });
  return out;
}