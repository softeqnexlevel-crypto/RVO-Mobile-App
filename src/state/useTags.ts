// src/state/useTags.ts
// Shared readers over the live backend data. History comes from the server if useLiveData exposes it,
// otherwise from the in-app recorder.
import { useCallback } from 'react';
import { useLiveData, toChartNumber } from './liveData';
import { History } from '../lib/trendMath';
import { isActive } from '../lib/status';
import { useRecordedHistory } from './history';

export function useTags() {
  const live = useLiveData();
  const recorded = useRecordedHistory();

  /** Raw value as the backend sent it (unwraps { value } envelopes). */
  const raw = useCallback(
    (tag: string): unknown => {
      const r: any = live.get(tag);
      return r && typeof r === 'object' ? r.value : r;
    },
    [live]
  );

  /** Numeric value (ON/OFF -> 1/0). null = no data or a text state. */
  const num = useCallback(
    (tag: string): number | null => toChartNumber(raw(tag)),
    [raw]
  );

  /** Text state such as the SystemOperation mode ("FILTER"). null = no data. */
  const str = useCallback(
    (tag: string): string | null => {
      const v = raw(tag);
      return v === null || v === undefined || v === '' ? null : String(v);
    },
    [raw]
  );

  /** Boolean state. null = no data. */
  const running = useCallback(
    (tag: string): boolean | null => {
      const v = raw(tag);
      return v === null || v === undefined ? null : isActive(v);
    },
    [raw]
  );

  const history: History =
    (live as unknown as { history?: History }).history ?? recorded;

  const lastUpdate: number | string | Date | null =
    (live as unknown as { lastUpdate?: number | string | Date }).lastUpdate ??
    null;

  return { raw, num, str, running, history, lastUpdate, live };
}