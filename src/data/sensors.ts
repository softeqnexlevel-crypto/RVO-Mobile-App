// src/data/sensors.ts
// Sensor catalogue for the Trends tab. Mirrors SENSOR_MAP on the web.
// Tag names are confirmed against the web DataContext (see data/keyMapping.ts).
export type SensorDef = { key: string; tag: string; label: string; unit: string; color: string; decimals: number };

export const CHART_COLORS = {
  primary: '#0ea5e9',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
};

export const SENSORS: SensorDef[] = [
  { key: 'feedFlow', tag: 'RO5-FEEDFlow', label: 'Feed Flow', unit: 'm³/h', color: '#0ea5e9', decimals: 2 },
  { key: 'permeateFlow', tag: 'RO5-Permeateflow', label: 'Permeate Flow', unit: 'm³/h', color: '#06b6d4', decimals: 2 },
  { key: 'concentrateFlow', tag: 'RO5-ConcetrateFlow', label: 'Concentrate Flow', unit: 'm³/h', color: '#f59e0b', decimals: 2 },
  { key: 'roPressure', tag: 'RO5-ROPressure', label: 'RO Pressure', unit: 'bar', color: '#ef4444', decimals: 2 },
  { key: 'interstagePressure', tag: 'RO5-InterstagePress', label: 'Interstage Pressure', unit: 'bar', color: '#f97316', decimals: 2 },
  { key: 'concentratePressure', tag: 'RO5-ConcetratePress', label: 'Concentrate Pressure', unit: 'bar', color: '#eab308', decimals: 2 },
  { key: 'filterInPressure', tag: 'RO5-MediaFilterInPress', label: 'Filter Inlet Pressure', unit: 'bar', color: '#14b8a6', decimals: 2 },
  { key: 'filterOutPressure', tag: 'RO5-MediaFilterOutPress', label: 'Filter Outlet Pressure', unit: 'bar', color: '#22c55e', decimals: 2 },
  { key: 'stage1Dp', tag: 'RO5-Stage1Delta', label: 'Stage 1 Delta P', unit: 'bar', color: '#a855f7', decimals: 2 },
  { key: 'stage2Dp', tag: 'RO5-Stage2Delta', label: 'Stage 2 Delta P', unit: 'bar', color: '#ec4899', decimals: 2 },
  { key: 'filterDp', tag: 'RO5-MediaFilterDeltaP', label: 'Filter Delta P', unit: 'bar', color: '#8b5cf6', decimals: 2 },
  { key: 'recovery', tag: 'RO5-SystemRecovery', label: 'System Recovery', unit: '%', color: '#22c55e', decimals: 1 },
  { key: 'productEc', tag: 'RO5-PureWaterEc', label: 'Product Water EC', unit: 'µS/cm', color: '#38bdf8', decimals: 0 },
  { key: 'feedTankLevel', tag: 'RO5-FeedTankLevel', label: 'Feed Tank Level', unit: '%', color: '#3b82f6', decimals: 1 },
  { key: 'feedTankRaw', tag: 'RO5-FeedTankLevelRaw', label: 'Feed Tank Raw', unit: 'mA', color: '#64748b', decimals: 3 },
  { key: 'systemActive', tag: 'RO5-SystemActive', label: 'System Active', unit: '', color: '#22c55e', decimals: 0 },
  { key: 'systemOperation', tag: 'RO5-SystemOperation', label: 'System Operation', unit: '', color: '#0ea5e9', decimals: 0 },
];

export const SENSOR_BY_KEY: Record<string, SensorDef> = Object.fromEntries(SENSORS.map((s) => [s.key, s]));