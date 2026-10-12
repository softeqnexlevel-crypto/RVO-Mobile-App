// src/state/useHistoryRecorder.ts  — call once in the root layout.
import { useEffect, useRef } from 'react';
import { useLiveData, toChartNumber } from './liveData';
import { SENSORS } from '../data/sensors';
import { EXTRA_SENSORS, EQUIPMENT_TAGS } from '../data/extraSensors';
import { customTagsStore, useCustomTags } from './customTags';
import { settingsStore, useSettings } from './settingsStore';
import { publish, record } from './history';

export function useHistoryRecorder() {
  const live = useLiveData();
  const ref = useRef(live);
  ref.current = live;
  const { refreshSec } = useSettings();
  const custom = useCustomTags().tags;
  const customRef = useRef(custom);
  customRef.current = custom;

  useEffect(() => {
    const tick = () => {
      const tags = [...SENSORS.map((s) => s.tag), ...EXTRA_SENSORS.map((s) => s.tag), ...EQUIPMENT_TAGS.map((e) => e.tag), ...customRef.current.map((c) => c.tag)];
      for (const tag of tags) {
        const n = toChartNumber(ref.current.get(tag)); // ON/OFF -> 1/0; text states are skipped
        if (n !== null) record(tag, n);
      }
      publish();
    };
    tick();
    const id = setInterval(tick, refreshSec * 1000);
    return () => clearInterval(id);
  }, [refreshSec]);
}