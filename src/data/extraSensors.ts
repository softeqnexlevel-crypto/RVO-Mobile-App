// src/data/extraSensors.ts — real tags from the backend that aren't on the Trends chip bar.
import { SensorDef } from './sensors';
import { PLC_ALARMS } from '../lib/plcAlarms';

export const ANTISCALANT_ACTIVE_TAG = 'RO5-AntiscalantDosingActive'; // 'ON' / 'OFF'
export const ANTISCALANT_DAILY: SensorDef = { key: 'antiDaily', tag: 'RO5-AntiscalantDaily', label: 'Antiscalant Daily', unit: 'ml', color: '#f59e0b', decimals: 0 };
export const RUN_HOURS: SensorDef = { key: 'runHours', tag: 'RO5-SystemRunhrs', label: 'Run Hours', unit: 'hrs', color: '#38bdf8', decimals: 1 };

// Recorded into the in-app history and listed in Tag Manager / Reports.
export const EXTRA_SENSORS: SensorDef[] = [ANTISCALANT_DAILY, RUN_HOURS];

export const EQUIPMENT_TAGS = [
  { tag: 'RO5-Feedpump', label: 'Feed pump' },
  { tag: ANTISCALANT_ACTIVE_TAG, label: 'Antiscalant dosing' },
  { tag: 'RO5-PrefilterBackwash', label: 'Prefilter backwash' },
  { tag: 'RO5-PrefilterBackwashing', label: 'Prefilter backwashing' },
  ...PLC_ALARMS.map((a) => ({ tag: a.tag, label: `Alarm: ${a.title}` })),
];