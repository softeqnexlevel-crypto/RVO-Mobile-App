// src/lib/plcAlerts.ts
// The ONLY alerts the plant wants, read straight from the MQTT bits (same tags as the PLC monitor):
//
//   FeedTankLow                              ON  -> feed tank alarm
//   HighMediaDeltaP / HighPrefilterDeltaP    ON  -> filter differential pressure is high
//   PowerProblem                             ON  -> power problem
//   PrefilterBackwash / PrefilterBackwashing ON  -> system is backwashing
//
// Deliberately NOT alerts: S1DeltaHigh, S2DeltaHigh, HighROPressure (add a row below to re-enable).
// A bit is "ON" only for true / 1 / "ON" / "1" / "true". The string "OFF" is NOT on.

export type PlcAlertDef = {
  tags: string[];                       // any one of these bits being ON raises the alert
  title: string;
  severity: 'critical' | 'warning';     // TODO: severities are assumptions. Confirm with the plant.
};

export const PLC_ALERTS: PlcAlertDef[] = [
  { tags: ['RO5-FeedTankLow'], title: 'Feed tank low', severity: 'critical' },
  { tags: ['RO5-PowerProblem'], title: 'Power problem', severity: 'critical' },
  { tags: ['RO5-HighMediaDeltaP', 'RO5-HighPrefilterDeltaP'], title: 'High filter differential pressure', severity: 'warning' },
  { tags: ['RO5-PrefilterBackwash', 'RO5-PrefilterBackwashing'], title: 'Backwash in progress', severity: 'warning' },
];

/** Strict MQTT bit reader. null / undefined / "OFF" / 0 / false are all NOT on. */
export const flagOn = (v: unknown): boolean => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['1', 'true', 'on'].includes(v.trim().toLowerCase());
  return false;
};