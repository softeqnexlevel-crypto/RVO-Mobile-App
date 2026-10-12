// src/lib/feedTankCalibration.ts
// Raw transmitter signal -> tank %. 4.9 = 0%, 10.0 = 100%.
export const RAW_MIN = 4.9;
export const RAW_MAX = 10.0;

export function rawToPercent(raw: number | null | undefined): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const c = Math.min(RAW_MAX, Math.max(RAW_MIN, raw));
  return ((c - RAW_MIN) * 100) / (RAW_MAX - RAW_MIN);
}