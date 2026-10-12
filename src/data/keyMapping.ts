// src/data/keyMapping.ts
// Backend key (as the PLC service emits it) -> app tag name.
// Keep in sync with the web DataContext. A key that is not listed here is ignored by the app.
export const KEY_MAPPING: Record<string, string> = {
  'siemens200smart-RO5-FEEDFlow': 'RO5-FEEDFlow',
  'siemens200smart-RO5-Permeateflow': 'RO5-Permeateflow',
  'siemens200smart-RO5-ConcetrateFlow': 'RO5-ConcetrateFlow',
  'siemens200smart-RO5-ROPressure': 'RO5-ROPressure',
  'siemens200smart-RO5-InterstagePress': 'RO5-InterstagePress',
  'siemens200smart-RO5-ConcetratePress': 'RO5-ConcetratePress',
  'siemens200smart-RO5-Stage1Delta': 'RO5-Stage1Delta',
  'siemens200smart-RO5-Stage2Delta': 'RO5-Stage2Delta',
  'siemens200smart-RO5-MediaFilterInPress': 'RO5-MediaFilterInPress',
  'siemens200smart-RO5-MediaFilterOutPress': 'RO5-MediaFilterOutPress',
  'siemens200smart-RO5-MediaFilterDeltaP': 'RO5-MediaFilterDeltaP',
  'siemens200smart-RO5-SystemRecovery': 'RO5-SystemRecovery',
  'siemens200smart-RO5-PureWaterEc': 'RO5-PureWaterEc',
  'siemens200smart-RO5-FeedTankLevel': 'RO5-FeedTankLevel',
  'siemens200smart-RO5-FeedTankLevelRaw': 'RO5-FeedTankLevelRaw',
  'RO5-FeedTankLevelRaw': 'RO5-FeedTankLevelRaw',
  'RO5-Feedpump': 'RO5-Feedpump',
  'siemens200smart-RO5-Feedpump': 'RO5-Feedpump',

  // High pressure pump (real tag, used by the web dashboard)
  'siemens200smart-RO5-HPPpump': 'RO5-HPPpump',
  'RO5-HPPpump': 'RO5-HPPpump',
  HPPpump: 'RO5-HPPpump',

  'RO5-PrefilterBackwash': 'RO5-PrefilterBackwash',
  'siemens200smart-RO5-PrefilterBackwash': 'RO5-PrefilterBackwash',
  'RO5-PrefilterBackwashing': 'RO5-PrefilterBackwashing',
  'siemens200smart-RO5-PrefilterBackwashing': 'RO5-PrefilterBackwashing',
  'siemens200smart-RO5-SystemOperation': 'RO5-SystemOperation',
  'RO5-SystemOperation': 'RO5-SystemOperation',
  'RO5-SystemOn': 'RO5-SystemOperation',
  'siemens200smart-RO5-SystemOn': 'RO5-SystemOperation',
  SystemOperation: 'RO5-SystemOperation',
  'siemens200smart-RO5-SystemMode': 'RO5-SystemMode',
  'RO5-SystemMode': 'RO5-SystemMode',
  SystemMode: 'RO5-SystemMode',
  'siemens200smart-RO5-AntiscalantDosingActive': 'RO5-AntiscalantDosingActive',
  'RO5-AntiscalantDoser': 'RO5-AntiscalantDosingActive',
  'siemens200smart-RO5-AntiscalantDoser': 'RO5-AntiscalantDosingActive',
  'RO5-AntiscalantDosingActive': 'RO5-AntiscalantDosingActive',
  AntiscalantDoser: 'RO5-AntiscalantDosingActive',
  AntiscalantDosingActive: 'RO5-AntiscalantDosingActive',
  'RO5/AntiscalantDoser': 'RO5-AntiscalantDosingActive',
  'siemens200smart-RO5-AntiscalantDaily': 'RO5-AntiscalantDaily',
  'RO5-AntiscalantDaily': 'RO5-AntiscalantDaily',
  AntiscalantDaily: 'RO5-AntiscalantDaily',

  // Service run hours (lifetime)
  'siemens200smart-RO5-SystemRunhrs': 'RO5-SystemRunhrs',
  'RO5-SystemRunhrs': 'RO5-SystemRunhrs',
  SystemRunhrs: 'RO5-SystemRunhrs',

  // Daily run hours (today)
  'siemens200smart-RO5-SystemDailyRunHrs': 'RO5-SystemDailyRunHrs',
  'RO5-SystemDailyRunHrs': 'RO5-SystemDailyRunHrs',
  SystemDailyRunHrs: 'RO5-SystemDailyRunHrs',

  // Master ON/OFF. Must stay separate from SystemOperation (see the web DataContext note).
  'RO5-SystemActive': 'RO5-SystemActive',
  'siemens200smart-RO5-SystemActive': 'RO5-SystemActive',
  SystemActive: 'RO5-SystemActive',

  // PLC alarm flags
  'RO5-HighPrefilterDeltaP': 'RO5-HighPrefilterDeltaP',
  'RO5-PowerProblem': 'RO5-PowerProblem',
  'RO5-HighMediaDeltaP': 'RO5-HighMediaDeltaP',
  'RO5-S2DeltaHigh': 'RO5-S2DeltaHigh',
  'RO5-S1DeltaHigh': 'RO5-S1DeltaHigh',
  'RO5-HighROPressure': 'RO5-HighROPressure',
  'RO5-FeedTankLow': 'RO5-FeedTankLow',
};

/** The 15 measurement tags that count toward "x / 15 sensors". */
export const SENSOR_KEYS = [
  'RO5-FEEDFlow', 'RO5-Permeateflow', 'RO5-ConcetrateFlow', 'RO5-ROPressure', 'RO5-InterstagePress',
  'RO5-ConcetratePress', 'RO5-Stage1Delta', 'RO5-Stage2Delta', 'RO5-MediaFilterInPress',
  'RO5-MediaFilterOutPress', 'RO5-MediaFilterDeltaP', 'RO5-SystemRecovery', 'RO5-PureWaterEc',
  'RO5-FeedTankLevel', 'RO5-FeedTankLevelRaw',
];

const UNITS: Record<string, string> = {
  'RO5-FEEDFlow': 'm³/h', 'RO5-Permeateflow': 'm³/h', 'RO5-ConcetrateFlow': 'm³/h',
  'RO5-ROPressure': 'bar', 'RO5-InterstagePress': 'bar', 'RO5-ConcetratePress': 'bar',
  'RO5-Stage1Delta': 'bar', 'RO5-Stage2Delta': 'bar', 'RO5-MediaFilterInPress': 'bar',
  'RO5-MediaFilterOutPress': 'bar', 'RO5-MediaFilterDeltaP': 'bar', 'RO5-SystemRecovery': '%',
  'RO5-PureWaterEc': 'µS/cm', 'RO5-FeedTankLevel': '%', 'RO5-AntiscalantDaily': 'ml',
  'RO5-SystemRunhrs': 'hrs', 'RO5-SystemDailyRunHrs': 'hrs',
};
export const unitFor = (tag: string) => UNITS[tag] ?? '';

/** ON/OFF normalisation for the antiscalant doser bit. */
export function normalizeOnOff(v: unknown): 'ON' | 'OFF' {
  if (typeof v === 'string') { const s = v.toUpperCase().trim(); return s === 'ON' || s === 'TRUE' || s === '1' ? 'ON' : 'OFF'; }
  if (typeof v === 'boolean') return v ? 'ON' : 'OFF';
  if (typeof v === 'number') return v === 1 ? 'ON' : 'OFF';
  return 'OFF';
}