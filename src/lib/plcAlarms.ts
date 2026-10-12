// src/lib/plcAlarms.ts — alarm flags the PLC service already sends (bits, 'ON' when active).
// Severity is my assumption; adjust to your alarm policy.
export type PlcAlarmDef = { tag: string; title: string; severity: 'critical' | 'warning' };
export const PLC_ALARMS: PlcAlarmDef[] = [
  { tag: 'RO5-PowerProblem', title: 'Power problem', severity: 'critical' },
  { tag: 'RO5-HighROPressure', title: 'High RO pressure', severity: 'critical' },
  { tag: 'RO5-FeedTankLow', title: 'Feed tank low', severity: 'critical' },
  { tag: 'RO5-HighPrefilterDeltaP', title: 'High prefilter ΔP', severity: 'warning' },
  { tag: 'RO5-HighMediaDeltaP', title: 'High media filter ΔP', severity: 'warning' },
  { tag: 'RO5-S1DeltaHigh', title: 'Stage 1 ΔP high', severity: 'warning' },
  { tag: 'RO5-S2DeltaHigh', title: 'Stage 2 ΔP high', severity: 'warning' },
];