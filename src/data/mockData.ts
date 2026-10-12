// src/data/mockData.ts
export interface TankRow {
  id: string;
  name: string;
  tag: string;
  volume: number;
  capacity: number;
  unit: string;
  hiLevel: number; // % of capacity
  loLevel: number; // % of capacity
  status: 'OK' | 'HIGH' | 'LOW' | 'CRITICAL';
  medium: string;
}

/** Fill level as a 0–100 percentage. */
export const tankPercent = (t: Pick<TankRow, 'volume' | 'capacity'>) =>
  (t.volume / t.capacity) * 100;

export const TANKS: TankRow[] = [
  { id: 't1', name: 'Raw Feed Tank', tag: 'TK-101', volume: 288, capacity: 450, unit: 'm³', hiLevel: 90, loLevel: 20, status: 'OK', medium: 'Raw Water' },
  { id: 't2', name: 'Product Water Tank', tag: 'TK-201', volume: 369, capacity: 450, unit: 'm³', hiLevel: 90, loLevel: 20, status: 'OK', medium: 'RO Permeate' },
  // was 42/120 = 35 %, which is above its 30 % low setpoint yet flagged LOW
  { id: 't3', name: 'Backwash Recovery', tag: 'TK-301', volume: 33, capacity: 120, unit: 'm³', hiLevel: 85, loLevel: 30, status: 'LOW', medium: 'Filter Backwash' },
  { id: 't4', name: 'Antiscalant Dosing', tag: 'TK-401', volume: 48, capacity: 200, unit: 'L', hiLevel: 80, loLevel: 25, status: 'LOW', medium: 'Chemical' },
  { id: 't5', name: 'CIP Caustic Tank', tag: 'TK-501', volume: 176, capacity: 220, unit: 'L', hiLevel: 90, loLevel: 15, status: 'OK', medium: 'NaOH 2%' },
  { id: 't6', name: 'CIP Acid Tank', tag: 'TK-502', volume: 30, capacity: 220, unit: 'L', hiLevel: 90, loLevel: 15, status: 'CRITICAL', medium: 'Citric Acid' },
];

export interface ProductionEvent {
  id: string;
  time: string;
  label: string;
  value: string;
  unit: string;
  tone: 'nominal' | 'warning' | 'critical' | 'info' | 'neutral';
}

// Newest first
export const PRODUCTION_EVENTS: ProductionEvent[] = [
  { id: 'p1', time: '14:42', label: 'Permeate Flow', value: '142.6', unit: 'm³/h', tone: 'nominal' },
  { id: 'p2', time: '14:42', label: 'Recovery', value: '74.2', unit: '%', tone: 'nominal' },
  { id: 'p3', time: '14:42', label: 'Product EC', value: '142', unit: 'µS/cm', tone: 'critical' },
  { id: 'p6', time: '14:30', label: 'Product EC Limit Exceeded', value: '142', unit: 'µS/cm', tone: 'critical' },
  { id: 'p4', time: '14:20', label: 'MMF Backwash', value: 'COMPLETE', unit: '', tone: 'info' },
  { id: 'p5', time: '14:05', label: 'HP Pump 1 Start', value: 'ONLINE', unit: '', tone: 'info' },
  { id: 'p7', time: '13:42', label: 'Antiscalant Dose', value: '4.8', unit: 'ppm', tone: 'nominal' },
];

export interface BatchRecord {
  id: string;
  startTime: string;
  endTime: string;
  volume: number;
  recovery: number;
  ec: number;
  status: 'COMPLETE' | 'RUNNING' | 'ABORTED';
}

// Volumes now add up to today's 753 m³ shown on the Production screen
export const RECENT_BATCHES: BatchRecord[] = [
  { id: 'b1', startTime: '08:00', endTime: '10:12', volume: 268, recovery: 74.8, ec: 108, status: 'COMPLETE' },
  { id: 'b2', startTime: '10:15', endTime: '12:08', volume: 212, recovery: 73.4, ec: 112, status: 'COMPLETE' },
  { id: 'b3', startTime: '12:20', endTime: '13:45', volume: 155, recovery: 71.8, ec: 120, status: 'COMPLETE' },
  { id: 'b4', startTime: '13:50', endTime: '—', volume: 118, recovery: 74.2, ec: 142, status: 'RUNNING' },
];

export interface AlarmRecord {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  ago: string;
  source: string;
  acknowledged: boolean;
}

export const ALARM_HISTORY: AlarmRecord[] = [
  { id: 'a1', severity: 'critical', title: 'Product EC Limit Exceeded', detail: 'Sensor A-EC-402 reading 142 µS/cm against set limit 120 µS/cm.', ago: '12m ago', source: 'A-EC-402', acknowledged: false },
  { id: 'a2', severity: 'warning', title: 'MMF Differential Pressure Approaching Limit', detail: 'Auto-backwash initiated to prevent fouling.', ago: '34m ago', source: 'DP-201', acknowledged: false },
  { id: 'a3', severity: 'info', title: 'Chemical Dosing Tank Level Low (24%)', detail: 'Batch replenishment scheduled for 04:00.', ago: '1h 14m ago', source: 'LT-401', acknowledged: true },
  // severity was 'warning' although the title says Critical
  { id: 'a4', severity: 'critical', title: 'CIP Acid Tank Level Critical', detail: 'Citric acid tank below 15% setpoint.', ago: '2h 02m ago', source: 'LT-502', acknowledged: false },
  { id: 'a5', severity: 'info', title: 'Scheduled Backwash Complete', detail: 'MMF backwash cycle terminated normally.', ago: '2h 40m ago', source: 'SEQ-MMF', acknowledged: true },
  { id: 'a6', severity: 'warning', title: 'HP Pump 2 Vibration Elevated', detail: 'Vibration 4.8 mm/s against 4.5 warning threshold.', ago: '3h 15m ago', source: 'VT-202', acknowledged: true },
  { id: 'a7', severity: 'critical', title: 'RO Train A Permeate DP High', detail: 'Permeate differential pressure 2.4 bar against 2.2 alarm limit.', ago: '5h 18m ago', source: 'DP-401', acknowledged: true },
];

/** Single source of truth for the Alarms tab badge. */
export const ACTIVE_ALARM_COUNT = ALARM_HISTORY.filter((a) => !a.acknowledged).length;

export interface SensorRow {
  id: string;
  tag: string;
  label: string;
  value: string;
  unit: string;
  status: 'online' | 'offline' | 'fault';
}

// Feed / permeate / pressure previously read 86.4 / 0.0 / 0.0 while the plant
// was producing 142.6 m³/h at 74.2 % recovery (feed = 142.6 / 0.742 ≈ 192).
export const SENSORS: SensorRow[] = [
  { id: 's1', tag: 'FT-101', label: 'Feed Flow', value: '192.2', unit: 'm³/h', status: 'online' },
  { id: 's2', tag: 'FT-201', label: 'Permeate Flow', value: '142.6', unit: 'm³/h', status: 'online' },
  { id: 's3', tag: 'PT-301', label: 'RO Feed Pressure', value: '14.8', unit: 'bar', status: 'online' },
  { id: 's4', tag: 'A-EC-402', label: 'Product EC', value: '142', unit: 'µS/cm', status: 'fault' },
  { id: 's5', tag: 'DP-201', label: 'MMF ΔP', value: '0.62', unit: 'bar', status: 'online' },
  { id: 's6', tag: 'LT-101', label: 'Feed Tank Level', value: '64', unit: '%', status: 'online' },
  { id: 's7', tag: 'LT-401', label: 'Antiscalant Level', value: '24', unit: '%', status: 'online' },
  { id: 's8', tag: 'VT-202', label: 'HP Pump Vibration', value: '4.8', unit: 'mm/s', status: 'online' },
  { id: 's9', tag: 'TT-501', label: 'CIP Temperature', value: '—', unit: '°C', status: 'offline' },
];