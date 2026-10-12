// src/lib/status.ts
export const isActive = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['1', 'true', 'on', 'active', 'yes', 'running', 'enabled', 'online'].includes(value.toLowerCase().trim());
  return !!value;
};

export type Tone = 'normal' | 'warning' | 'danger' | 'muted';

export const recoveryStatus = (pct: number | null): { tone: Tone; label: string } =>
  pct === null ? { tone: 'muted', label: 'No data' } : pct < 60 ? { tone: 'danger', label: 'Low' } : pct < 75 ? { tone: 'warning', label: 'Check' } : { tone: 'normal', label: 'Normal' };

// ASSUMPTION: RO health is a simple score from alarms (the web formula wasn't provided).
export function roHealth(active: number, critical: number): { pct: number; tone: Tone; label: string } {
  const pct = Math.max(0, 100 - critical * 25 - (active - critical) * 10);
  return pct >= 90 ? { pct, tone: 'normal', label: 'Excellent' } : pct >= 70 ? { pct, tone: 'normal', label: 'Good' } : pct >= 50 ? { pct, tone: 'warning', label: 'Fair' } : { pct, tone: 'danger', label: 'Poor' };
}