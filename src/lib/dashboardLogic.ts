// src/lib/dashboardLogic.ts
// Ported from the web Dashboard.jsx. Same PLC tag names, same thresholds.
export type ToneName = 'nominal' | 'warning' | 'critical' | 'info' | 'neutral';
export type Mode = 'FILTER' | 'BACKWASH' | 'STANDBY' | 'OFF' | 'UNKNOWN';

export const TOTAL_SENSORS = 15;
export const LIMITS = {
  membraneDp: 2.0,
  filterDp: 0.4,
  recoveryCritical: 50,
  tankEmpty: 2,
  ecHigh: 150,
};

export const isActive = (v: unknown): boolean => {
  if (v === undefined || v === null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['1', 'true', 'on', 'active', 'yes', 'running', 'enabled', 'online'].includes(v.toLowerCase().trim());
  return !!v;
};

const num = (v: unknown): number => (v === undefined || v === null || v === '' ? NaN : Number(v));
export const safeNumber = (v: unknown, fallback = 0) => (Number.isFinite(num(v)) ? num(v) : fallback);
const fmt = (n: number | null, d = 1) => (n === null || !Number.isFinite(n) ? '--' : n.toFixed(d));

export function formatHours(hrs: number) {
  if (!Number.isFinite(hrs) || hrs < 0) return '0h 00m';
  const t = Math.round(hrs * 60);
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`;
}

export function normalizeSystemMode(raw: unknown): Mode {
  if (raw === undefined || raw === null || raw === '') return 'UNKNOWN';
  const v = String(raw).trim().toUpperCase();
  if (v.includes('FILTER')) return 'FILTER';
  if (v.includes('BACKWASH') || v.includes('BACK WASH')) return 'BACKWASH';
  if (v.includes('STANDBY') || v.includes('STAND BY')) return 'STANDBY';
  if (v === 'OFF' || v === 'STOP' || v === 'STOPPED') return 'OFF';
  return 'UNKNOWN';
}

/**
 * Transmitter calibration from the web code comment: 4.9 -> 10 %, 10.0 -> 100 %.
 * Reconstructed from that comment: replace with your real feedTankCalibration if it differs.
 */
export function rawToPercent(raw: number) {
  return Math.max(0, Math.min(100, 10 + ((raw - 4.9) * 90) / 5.1));
}

export function deriveDashboard(get: (k: string) => unknown, criticalAlarms: number, dailyProduction: number) {
  const n = (k: string) => safeNumber(get(k));
  const opt = (k: string) => (Number.isFinite(num(get(k))) ? n(k) : null);

  const systemActiveOn = isActive(get('RO5-SystemActive'));
  const feedPumpOn = isActive(get('RO5-Feedpump'));
  const backwashOn = isActive(get('RO5-PrefilterBackwash'));

  const rawTank = num(get('RO5-FeedTankLevelRaw'));
  const tankPct = Number.isFinite(rawTank) ? rawToPercent(rawTank) : opt('RO5-FeedTankLevel');
  const tankEmpty = tankPct !== null && tankPct <= LIMITS.tankEmpty;

  const plcMode = normalizeSystemMode(get('RO5-SystemMode'));
  const inferred: Mode = !feedPumpOn ? 'OFF' : backwashOn ? 'BACKWASH' : 'FILTER';
  const rawMode = plcMode !== 'UNKNOWN' ? plcMode : inferred;
  const mode: Mode = systemActiveOn ? rawMode : 'OFF'; // SystemActive is the master switch

  const standbyReason = !systemActiveOn ? null : tankEmpty ? 'Feed tank empty' : criticalAlarms > 0 ? 'Critical alarm active' : rawMode === 'STANDBY' ? 'PLC reports standby' : null;

  let op: { label: string; tone: ToneName; sub: string };
  if (!systemActiveOn) op = { label: 'OFF', tone: 'critical', sub: tankEmpty ? 'Feed tank empty - system stopped' : 'System Active is OFF' };
  else if (mode === 'FILTER') op = { label: 'FILTER', tone: 'nominal', sub: 'Filtering — all pumps running' };
  else if (mode === 'BACKWASH') op = { label: 'BACKWASH', tone: 'warning', sub: 'Backwash in progress' };
  else if (mode === 'STANDBY') op = { label: 'STANDBY', tone: 'warning', sub: standbyReason ? `Standby — ${standbyReason}` : 'System Active ON, not filtering' };
  else op = { label: 'OFF', tone: 'critical', sub: 'System offline' };

  const feed = n('RO5-FEEDFlow');
  const permeate = n('RO5-Permeateflow');
  const concentrate = n('RO5-ConcetrateFlow');
  const pressure = opt('RO5-ROPressure');
  const recovery = n('RO5-SystemRecovery');
  const filterDp = n('RO5-MediaFilterDeltaP');
  const stage1Dp = n('RO5-Stage1Delta');
  const stage2Dp = n('RO5-Stage2Delta');
  const ec = n('RO5-PureWaterEc');

  const dp = (v: number, limit: number): { tone: ToneName; status: string } =>
    v >= limit ? { tone: 'critical', status: 'Critical' } : v > 0 ? { tone: 'nominal', status: 'Normal' } : { tone: 'info', status: '—' };

  const kpis: { label: string; unit: string; value: string; tone: ToneName; status: string }[] = [
    { label: 'Feed Flow', unit: 'm³/h', value: fmt(feed), tone: feed > 40 ? 'nominal' : feed > 0 ? 'warning' : 'critical', status: feed > 40 ? 'Normal' : feed > 0 ? 'Check' : 'No flow' },
    { label: 'Permeate Flow', unit: 'm³/h', value: fmt(permeate), tone: permeate > 30 ? 'nominal' : permeate > 0 ? 'warning' : 'critical', status: permeate > 30 ? 'Normal' : permeate > 0 ? 'Low' : 'No flow' },
    {
      label: 'System Recovery', unit: '%', value: fmt(recovery),
      tone: recovery > 0 && recovery < LIMITS.recoveryCritical ? 'critical' : recovery > 75 ? 'nominal' : recovery > 0 ? 'warning' : 'info',
      status: recovery > 0 && recovery < LIMITS.recoveryCritical ? 'Critical' : recovery > 75 ? 'Good' : recovery > 0 ? 'Check' : '—',
    },
    {
      label: 'RO Pressure', unit: 'bar', value: fmt(pressure),
      tone: pressure === null ? 'neutral' : pressure >= 8 && pressure <= 16 ? 'nominal' : pressure > 16 ? 'critical' : pressure > 0 ? 'warning' : 'info',
      status: pressure === null ? 'No Data' : pressure >= 8 && pressure <= 16 ? 'Normal' : pressure > 0 ? 'Check' : '—',
    },
    { label: 'Concentrate Flow', unit: 'm³/h', value: fmt(concentrate), tone: concentrate > 15 ? 'nominal' : 'warning', status: concentrate > 15 ? 'Normal' : 'Low' },
    { label: 'Filter Delta P', unit: 'bar', value: fmt(filterDp, 2), ...dp(filterDp, LIMITS.filterDp) },
    { label: 'Stage 1 Delta P', unit: 'bar', value: fmt(stage1Dp, 2), ...dp(stage1Dp, LIMITS.membraneDp) },
    { label: 'Stage 2 Delta P', unit: 'bar', value: fmt(stage2Dp, 2), ...dp(stage2Dp, LIMITS.membraneDp) },
    { label: 'Product Water EC', unit: 'µS/cm', value: fmt(ec, 0), tone: ec > LIMITS.ecHigh ? 'critical' : ec > 0 ? 'nominal' : 'info', status: ec > LIMITS.ecHigh ? 'High' : ec > 0 ? 'Within limits' : '—' },
    { label: 'Daily Production', unit: 'm³', value: Math.round(dailyProduction).toLocaleString(), tone: dailyProduction > 0 ? 'nominal' : 'info', status: `${fmt(permeate)} m³/h now` },
  ];

  return { op, kpis, systemActiveOn, pressure, tankPct, runHrs: n('RO5-SystemRunhrs') };
}