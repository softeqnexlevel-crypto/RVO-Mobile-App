// src/state/alarmStore.ts
// The alert list the whole app uses (Alerts screen, Dashboard, tab badge).
// It is driven ONLY by the live MQTT bits (see lib/plcAlerts.ts). There are no stored or sample alarms.
// The only thing remembered here is what the operator did to a live alert (acknowledge / isolate),
// in memory. That memory is dropped automatically when the bit goes OFF, so the next occurrence
// alerts again.
import { useEffect, useSyncExternalStore } from 'react';
import { usePlcAlarms } from './usePlcAlarms';

export type Alarm = {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
  ago: string;
  acknowledged: boolean;
};

const acked = new Set<string>();
const isolated = new Set<string>();
let version = 0;
const subs = new Set<() => void>();
const bump = () => { version += 1; subs.forEach((f) => f()); };
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
const getVersion = () => version;

export function acknowledgeAlarm(id: string) {
  if (!acked.has(id)) { acked.add(id); bump(); }
}

/** Hides a live alert until its bit goes OFF and ON again. */
export function isolateAlarm(id: string) {
  if (!isolated.has(id)) { isolated.add(id); bump(); }
}

function prune(liveIds: Set<string>) {
  let changed = false;
  [acked, isolated].forEach((set) => {
    Array.from(set).forEach((id) => { if (!liveIds.has(id)) { set.delete(id); changed = true; } });
  });
  if (changed) bump();
}

export function useAlarmSummary() {
  const plc = usePlcAlarms();
  useSyncExternalStore(subscribe, getVersion, getVersion); // re-render on acknowledge / isolate

  // Forget acknowledge / isolate once the bit is OFF. Never prune on stale data (a blip must not reset them).
  const ids = plc.list.map((a) => a.tag).join('|');
  useEffect(() => {
    if (plc.fresh) prune(new Set(plc.list.map((a) => a.tag)));
  }, [ids, plc.fresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const active: Alarm[] = plc.list
    .filter((a) => !isolated.has(a.tag))
    .map((a) => ({
      id: a.tag,
      severity: a.severity,
      title: a.title,
      detail: `Reported by the plant controller (${a.tag.replace('RO5-', '')} is ON). Clears by itself when the bit goes OFF.`,
      ago: 'now',
      acknowledged: acked.has(a.tag),
    }));

  return {
    active,
    critical: active.filter((a) => a.severity === 'critical').length,
    unacknowledged: active.filter((a) => !a.acknowledged).length,
  };
}