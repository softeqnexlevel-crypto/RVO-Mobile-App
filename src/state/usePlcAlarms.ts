// src/state/usePlcAlarms.ts
// Active PLC alerts, computed live from the MQTT bits. Nothing is stored or invented:
// when a bit goes OFF the alert disappears by itself, and with no fresh data there are no alerts.
import { useTags } from './useTags';
import { PLC_ALERTS, flagOn } from '../lib/plcAlerts';

export type PlcAlarm = { tag: string; title: string; severity: 'critical' | 'warning' };

export function usePlcAlarms() {
  const { live } = useTags();
  const fresh = live.connected && live.isFresh;

  const list: PlcAlarm[] = [];
  if (fresh) {
    for (const def of PLC_ALERTS) {
      const on = def.tags.find((t) => flagOn(live.get(t)));
      if (on) list.push({ tag: on, title: def.title, severity: def.severity });
    }
  }

  const critical = list.filter((a) => a.severity === 'critical').length;
  return { list, count: list.length, critical, warning: list.length - critical, fresh };
}