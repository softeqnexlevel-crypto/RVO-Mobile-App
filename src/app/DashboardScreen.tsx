// src/app/DashboardScreen.tsx
// Mirrors the web Dashboard.jsx logic for feed tank, System Operation, System Active,
// equipment bits and run hours, so the app and the Executive Dashboard always agree.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import { colors, radii, spacing } from '../theme/tokens';
import AlarmDrawer, { Alarm } from '../components/AlarmDrawer';
import InstrumentCard, { InstrumentTone } from '../components/InstrumentCard';
import PressureGauge, { classifyPressure } from '../components/PressureGauge';
import TankLevelGauge, { classifyTankLevel } from '../components/TankLevelGauge';
import SystemStatusPanel, { Equipment } from '../components/SystemStatusPanel';
import TrendsPanel from '../components/TrendsPanel';
import { SENSOR_BY_KEY } from '../data/sensors';
import { recoveryStatus } from '../lib/status';
import { rawToPercent } from '../lib/feedTankCalibration';
import { toPts } from '../lib/trendMath';
import { useTags } from '../state/useTags';
import { useProductionTotals } from '../state/useProductionTotals';
import { deriveDashboard, LIMITS, TOTAL_SENSORS } from '../lib/dashboardLogic';
import { acknowledgeAlarm, isolateAlarm, useAlarmSummary } from '../state/alarmStore';

type Tab = 'overview' | 'alerts' | 'trends';
type ToneName = 'nominal' | 'warning' | 'critical' | 'info' | 'neutral';

const TONE: Record<ToneName, string> = {
  nominal: colors.tertiary,
  warning: colors.secondary,
  critical: colors.error,
  info: colors.primary,
  neutral: colors.onSurfaceVariant,
};

const toInstrumentTone = (key?: string): InstrumentTone =>
  key === 'critical' || key === 'low' ? 'danger' : key === 'warning' || key === 'mid' ? 'warning' : key ? 'normal' : 'muted';

/* ---------- PLC state helpers (same rules as the web Dashboard.jsx) ---------- */

// Canonical operation code. The DISPLAY text is derived from it (OP_LABEL), never compared against.
type OpMode = 'FILTER' | 'BACKWASH' | 'STANDBY' | 'OFF' | 'UNKNOWN';

const normalizeOp = (raw: string | null | undefined): OpMode => {
  const v = (raw ?? '').trim().toUpperCase();
  if (v.includes('FILTER')) return 'FILTER';
  if (v.includes('BACKWASH') || v.includes('BACK WASH')) return 'BACKWASH';
  if (v.includes('STANDBY') || v.includes('STAND BY')) return 'STANDBY';
  if (v === 'OFF' || v === 'STOP' || v === 'STOPPED') return 'OFF';
  return 'UNKNOWN';
};

const OP_LABEL: Record<OpMode, string> = {
  FILTER: 'FILTER MODE',
  BACKWASH: 'BACKWASH MODE',
  STANDBY: 'STANDBY MODE',
  OFF: 'OFF',
  UNKNOWN: 'UNKNOWN',
};

// Same as the web bitOn(): reads an MQTT bit ("ON"/"OFF", 1/0, true/false) as a real boolean.
const truthy = (v: unknown): boolean => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['1', 'true', 'on', 'running', 'active', 'yes'].includes(v.trim().toLowerCase());
  return false;
};

// Same as the web safeNumber(): numbers pass, strings are parsed with parseFloat ("14.0 hrs" -> 14).
const toNumber = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }
  return null;
};

// Same scoring as the web computeHealthScore(): -15 per critical, -5 per other active alarm.
// No fresh data -> null (greyed ring), never 0.
const healthScore = (
  activeN: number, criticalN: number, fresh: boolean,
): { pct: number | null; label: string; tone: InstrumentTone } => {
  if (!fresh) return { pct: null, label: 'No data', tone: 'muted' };
  const pct = Math.max(0, Math.min(100, 100 - criticalN * 15 - Math.max(0, activeN - criticalN) * 5));
  if (pct > 80) return { pct, label: 'Excellent', tone: 'normal' };
  if (pct > 50) return { pct, label: 'Fair', tone: 'warning' };
  return { pct, label: 'Poor', tone: 'danger' };
};

// Formats a duration in HOURS (float, PLC-reported) as "Xh YYm". Same as the web.
const formatHours = (hrs: number | null): string => {
  if (hrs === null || !Number.isFinite(hrs) || hrs < 0) return '—';
  const total = Math.round(hrs * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
};

// KPI label -> PLC tag, used for the trend chip. Labels without a tag show no trend.
const KPI_TAG: Record<string, string> = {
  'Feed Flow': 'RO5-FEEDFlow',
  'Permeate Flow': 'RO5-Permeateflow',
  'System Recovery': 'RO5-SystemRecovery',
  'RO Pressure': 'RO5-ROPressure',
  'Concentrate Flow': 'RO5-ConcetrateFlow',
  'Filter Delta P': 'RO5-MediaFilterDeltaP',
  'Stage 1 Delta P': 'RO5-Stage1Delta',
  'Stage 2 Delta P': 'RO5-Stage2Delta',
  'Product Water EC': 'RO5-PureWaterEc',
  'Feed Tank Raw': 'RO5-FeedTankLevelRaw',
};

type Trend = { pct: number; dir: 'up' | 'down' | 'flat' };
type Pt = { t: number; v: number };

/** Change vs ~5 minutes ago, same idea as the web getTrend. */
function trendOf(pts: Pt[], windowMs = 5 * 60 * 1000): Trend | null {
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const ref = pts.find((p) => p.t >= last.t - windowMs) ?? pts[0];
  if (ref === last || !ref.v) return null;
  const pct = ((last.v - ref.v) / Math.abs(ref.v)) * 100;
  if (!Number.isFinite(pct)) return null;
  return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' };
}

/* ---------- Hero status card: big operation state + chips + mini stats ---------- */
function MiniStat({ icon, label, value, color, onPress }: {
  icon: keyof typeof MaterialIcons.glyphMap; label: string; value: string; color: string; onPress?: () => void;
}) {
  const body = (
    <View style={styles.miniStat} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.miniLabelRow}>
        <MaterialIcons name={icon} size={11} color={colors.onSurfaceVariant} />
        <Text style={styles.miniLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.miniValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
  return onPress ? (
    <Pressable style={{ flex: 1 }} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}>
      {body}
    </Pressable>
  ) : (
    <View style={{ flex: 1 }}>{body}</View>
  );
}

function HeroCard({
  tone, opLabel, activeOn, message, alarms, alarmTone, dailyHrs, onAlarmsPress,
}: {
  tone: ToneName; opLabel: string; activeOn: boolean; message: string;
  alarms: string; alarmTone: ToneName; dailyHrs: string; onAlarmsPress: () => void;
}) {
  const c = TONE[tone];
  const chip = activeOn ? TONE.nominal : TONE.critical;
  return (
    <LinearGradient
      colors={[`${c}55`, `${c}12`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { borderColor: `${c}55` }]}
    >
      <View style={styles.heroTop}>
        <View style={styles.heroTitleRow}>
          <MaterialIcons name="settings" size={14} color={c} />
          <Text style={styles.heroLabel}>SYSTEM OPERATION</Text>
        </View>
        <View style={[styles.heroChip, { backgroundColor: `${chip}26`, borderColor: `${chip}66` }]}>
          <MaterialIcons name="power-settings-new" size={12} color={chip} />
          <Text style={[styles.heroChipText, { color: chip }]}>{activeOn ? 'SYSTEM ACTIVE · ON' : 'SYSTEM ACTIVE · OFF'}</Text>
        </View>
      </View>

      <Text style={[styles.heroValue, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>{opLabel}</Text>
      <Text style={styles.heroSub} numberOfLines={1}>{message}</Text>

      <View style={styles.heroRule} />
      <View style={styles.miniRow}>
        <MiniStat icon="warning" label="Alarms" value={alarms} color={TONE[alarmTone]} onPress={onAlarmsPress} />
        <MiniStat icon="schedule" label="Daily Run Hrs" value={dailyHrs} color={colors.primary} />
      </View>
    </LinearGradient>
  );
}

/* ---------- KPI tile (icon + label + value, optional trend and note) ---------- */
type IconName = keyof typeof MaterialIcons.glyphMap;
const kpiIcon = (label: string): IconName => {
  const l = label.toLowerCase();
  if (l.includes('recovery')) return 'autorenew';
  if (l.includes('pressure') && !l.includes('delta')) return 'speed';
  if (l.includes('delta')) return 'swap-vert';
  if (l.includes('concentrate')) return 'invert-colors';
  if (l.includes('permeate')) return 'opacity';
  if (l.includes('tank')) return 'water-drop';
  if (l.includes('feed')) return 'water';
  if (l.includes('ec') || l.includes('conduct')) return 'bolt';
  if (l.includes('production')) return 'inventory-2';
  if (l.includes('run') || l.includes('hours')) return 'schedule';
  return 'insights';
};

function KpiCard({
  label,
  unit,
  value,
  tone,
  width,
  trend,
  note,
}: {
  label: string;
  unit: string;
  value: string;
  tone: ToneName;
  width: number;
  trend?: Trend | null;
  note?: string;   // small text bottom-right, e.g. "≈ 35.8%" or "49.6 m³/h now"
}) {
  const c = TONE[tone];
  const trendIcon: IconName = !trend ? 'remove' : trend.dir === 'up' ? 'trending-up' : trend.dir === 'down' ? 'trending-down' : 'trending-flat';
  return (
    <LinearGradient
      colors={[`${c}1A`, `${c}05`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, styles.kpiCard, { width, borderLeftWidth: 3, borderLeftColor: c }]}
      accessible
      accessibilityLabel={`${label}: ${value} ${unit}${note ? `. ${note}` : ''}`}
    >
      <View style={styles.kpiHead}>
        <View style={[styles.kpiIcon, { backgroundColor: `${c}26` }]}>
          <MaterialIcons name={kpiIcon(label)} size={14} color={c} />
        </View>
        <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
      </View>

      <View style={styles.kpiValueRow}>
        <Text style={[styles.kpiValue, { color: c }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {!!unit && <Text style={styles.kpiUnit} numberOfLines={1}>{unit}</Text>}
      </View>

      <View style={styles.kpiFoot}>
        {trend ? (
          <View style={styles.kpiTrend}>
            <MaterialIcons name={trendIcon} size={13} color={colors.onSurfaceVariant} />
            <Text style={styles.kpiTrendText}>{`${trend.pct > 0 ? '+' : ''}${trend.pct.toFixed(1)}%`}</Text>
          </View>
        ) : <View />}
        {note ? <Text style={styles.kpiNote} numberOfLines={1}>{note}</Text> : null}
      </View>
    </LinearGradient>
  );
}

/* ---------- Section header (label + hairline) ---------- */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

/* ---------- Screen ---------- */
export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const { active, critical, unacknowledged } = useAlarmSummary();
  const tabBarH = useContext(BottomTabBarHeightContext) ?? 0;

  const [tab, setTab] = useState<Tab>('overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [, setLastSync] = useState(() => new Date());

  const wide = width >= 900;
  const gap = spacing.sm;
  const inner = width - spacing.md * 2;
  const colW = (cols: number) => Math.floor((inner - gap * (cols - 1)) / cols);

  // Two instrument cards side by side on every screen size.
  const instW = colW(2);
  const gaugeSize = Math.max(100, Math.min(240, instW - spacing.md * 2 - 2)); // card padding + border
  const tankW = Math.round(gaugeSize * 0.55);
  const tankH = Math.round(gaugeSize * 0.95);

  const { live, num, str, history } = useTags(); // history = server history if available, else the in-app recorder

  // Today's production in m³. It is a database total (the PLC doesn't report it), so it comes from the backend
  // (GET /api/production-summary via state/useProductionTotals). Without a value it shows "—", never 0.
  // The hook takes no arguments and returns { data: { permeate: { daily, ... } }, loading, error, refresh }.
  const prod = useProductionTotals() as any;
  const dailyProduction: number | null = toNumber(prod?.data?.permeate?.daily ?? prod?.totals?.today ?? prod?.today ?? null);

  // kpis + pressure still come from deriveDashboard. Tank, operation, active state and run hours
  // are computed below so they match the web dashboard exactly.
  const { kpis, pressure } = deriveDashboard(live.get, critical, dailyProduction);
  const online = live.sensorCount;
  const hasFresh = live.connected && online > 0 && live.isFresh;

  // Change vs ~5 minutes ago for each KPI (same idea as the web getTrend).
  const kpiTrend = (label: string): Trend | null => {
    const tag = KPI_TAG[label];
    if (!tag) return null;
    try {
      return trendOf((toPts((history as any)?.[tag]) as Pt[]).slice(-60));
    } catch {
      return null;
    }
  };

  /* ---- Feed tank: raw transmitter -> rawToPercent (same as web + TanksScreen) ---- */
  const rawTank = num('RO5-FeedTankLevelRaw');
  const calTank = rawTank === null ? null : rawToPercent(rawTank);
  const feedPct: number | null = calTank === null ? null : Math.min(100, Math.max(0, calTank));

  /* ---- PLC-reported run hours. null shows as — (never 0) ---- */
  // Read the raw value and parse it like the web does, instead of relying on num().
  const serviceHrsRaw = toNumber(live.get('RO5-SystemRunhrs'));  
  // console.log(serviceHrsRaw)  
  const dailyHrsRaw = toNumber(live.get('RO5-SystemDailyRunHrs'));   
  // console.log(dailyHrsRaw)
  const serviceHrs = hasFresh ? serviceHrsRaw : null;
  const dailyHrs = hasFresh ? dailyHrsRaw : null;
// console.log(serviceHrs)
// console.log(dailyHrs)
  const pressureBand = classifyPressure(pressure);
  const tankBand = classifyTankLevel(feedPct);
  const tankDanger = feedPct !== null && feedPct <= LIMITS.tankEmpty;

  const drawerAlarms: Alarm[] = useMemo(
    () => active.map((a) => ({ id: a.id, severity: a.severity, title: a.acknowledged ? `${a.title} (Acknowledged)` : a.title, detail: a.detail, ago: a.ago })),
    [active],
  );

  const handleIsolate = (id: string) => {
    isolateAlarm(id);
    if (active.length <= 1) setDrawerOpen(false);
  };

  /* ---- Equipment bits: mirror of web Dashboard.jsx. Read the RAW value with the web's bitOn() rules. ---- */
  const bit = (tag: string) => hasFresh && truthy(live.get(tag));
  const feedPump = bit('RO5-Feedpump');
  const dosing = bit('RO5-AntiscalantDosingActive');
  const backwashOn = bit('RO5-PrefilterBackwash') || bit('RO5-PrefilterBackwashing');
  const sysRaw = live.get('RO5-SystemActive');
  const sysBit = hasFresh && truthy(sysRaw); // raw PLC bit, kept separate from the effective state
  const opText = str('RO5-SystemOperation');
  const hpRaw = live.get('RO5-HPPpump'); // real tag used by the web; falls back to derived if absent
  const hp = hasFresh && (hpRaw !== null && hpRaw !== undefined ? truthy(hpRaw) : sysBit && /filter/i.test(opText ?? ''));

  const plcOp = normalizeOp(opText);
  const opMode: OpMode =
    !hasFresh ? 'OFF'
    : plcOp !== 'UNKNOWN' ? plcOp
    : backwashOn ? 'BACKWASH'
    : feedPump || hp ? 'FILTER'
    : 'STANDBY';
  // Effective ON state: SystemActive bit OR any pump / backwash running, and OFF with no fresh data.
  const systemActiveOn = hasFresh && (sysBit || feedPump || hp || backwashOn);
  const opTone: ToneName =
    opMode === 'FILTER' ? 'nominal' : opMode === 'OFF' ? 'critical' :  opMode === 'UNKNOWN' ? 'neutral' : 'warning';

  // With no fresh data every equipment tile is greyed ("No data") instead of showing a false Stopped.
  const eq = (v: boolean): boolean | null => (hasFresh ? v : null);
  const equipment: Equipment[] = [
    { key: 'hp', label: 'High Pressure Pump', icon: 'build', running: eq(hp) },
    { key: 'feed', label: 'Feed Pump', icon: 'build', running: eq(feedPump) },
    { key: 'dosing', label: 'Antiscalant Dosing', icon: 'science', running: eq(dosing), text: !hasFresh ? 'No data' : dosing ? 'Dosing' : 'Stopped' },
    // The web shows the prefilter greyed with "No data" (it has no ON/OFF bit), so do the same.
    { key: 'pre', label: 'Prefilter', icon: 'filter-alt', running: null, text: 'No data' },
  ];

  /* ---- Recovery + RO Health: greyed ("No data") when nothing fresh is arriving, like the web ---- */
  const recoveryTag = SENSOR_BY_KEY.recovery?.tag;
  const recoveryLive = recoveryTag ? num(recoveryTag) : null;
  const recovery = hasFresh ? recoveryLive : null;
  const rec = recoveryStatus(recovery);
  // `active` / `critical` already come from the live MQTT alerts (state/alarmStore), nothing else is added.
  const totalActive = active.length;
  const totalCritical = critical;
  const health = healthScore(totalActive, totalCritical, hasFresh);

  const banner = totalCritical > 0
    ? { tone: 'danger' as const, text: `${totalCritical} critical alarm${totalCritical > 1 ? 's' : ''}` }
    : totalActive > 0
      ? { tone: 'warning' as const, text: `${totalActive} active alarm${totalActive > 1 ? 's' : ''}` }
      : { tone: 'normal' as const, text: 'All systems normal' };
  const recentAlarms = active.map((a) => ({ id: a.id, severity: a.severity, title: a.title, ago: a.ago }));

  const alarmTone: ToneName = totalCritical > 0 ? 'critical' : totalActive > 0 ? 'warning' : 'nominal';
  const alarmValue = String(totalActive).padStart(2, '0');

  /* ---- KPI list: deriveDashboard's cards, then the cards the web also shows ---- */
  // Drop any Daily Production / Feed Tank Raw from deriveDashboard so they are never doubled.
  const baseKpis = kpis.filter((k) => !/daily production|feed tank raw/i.test(k.label));
  const permeateNow = hasFresh ? num('RO5-Permeateflow') : null;
  const kpiCols = wide ? 5 : 2;

  return (
    <View style={styles.root}>
      {/* Status bar */}
      <SafeAreaView edges={['top']} style={styles.statusSafe}>
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View style={[styles.dot, { backgroundColor: !live.connected ? colors.error : hasFresh ? colors.tertiary : colors.secondary }]} />
            <Text
              style={[
                styles.statusTitle,
                { color: !live.connected ? colors.error : hasFresh ? colors.tertiary : colors.secondary },
              ]}
              numberOfLines={1}
            >
              {!live.connected ? 'DISCONNECTED' : hasFresh ? 'LIVE' : 'NO DATA'}
            </Text>
            <Text style={styles.statusMeta} numberOfLines={1}>
              {online}/{TOTAL_SENSORS}
            </Text>
          </View>
          <View style={styles.statusRight}>
            <View
              style={styles.hoursChip}
              accessible
              accessibilityLabel={`Daily run hours: ${formatHours(dailyHrs)}`}
            >
              <MaterialIcons name="schedule" size={12} color={dailyHrs === null ? colors.onSurfaceVariant : colors.primary} />
              <Text style={[styles.hoursChipText, { color: dailyHrs === null ? colors.onSurfaceVariant : colors.primary }]} numberOfLines={1}>
                {formatHours(dailyHrs)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && { opacity: 0.6 }]}
              onPress={() => { (live as any).refresh?.(); prod?.refresh?.(); setLastSync(new Date()); }}
              accessibilityRole="button"
              accessibilityLabel="Refresh"
            >
              <MaterialIcons name="sync" size={14} color={colors.onSurface} />
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {([
            ['overview', 'dashboard', 'Overview'],
            ['alerts', 'tune', 'Alerts'],
            ['trends', 'show-chart', 'Trends'],
          ] as const).map(([key, icon, label]) => {
            const isOn = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tab, isOn && styles.tabOn]}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isOn }}
              >
                <MaterialIcons name={icon} size={15} color={isOn ? '#fff' : colors.onSurfaceVariant} />
                <Text style={[styles.tabText, isOn && { color: '#fff' }]} numberOfLines={1}>{label}</Text>
                {key === 'alerts' && unacknowledged > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unacknowledged}</Text></View>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarH + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'overview' && (
          <>
            {/* Hero status card */}
            <HeroCard
              tone={opTone}
              opLabel={OP_LABEL[opMode]}
              activeOn={systemActiveOn}
              message={banner.text}
              alarms={alarmValue}
              alarmTone={alarmTone}
              dailyHrs={formatHours(dailyHrs)}
              onAlarmsPress={() => setDrawerOpen(true)}
            />

            {/* Live instruments: always side by side */}
            <SectionHeader>Live instruments</SectionHeader>
            <View style={styles.row}>
              <InstrumentCard
                style={{ flex: 1, minWidth: 0 }}
                title="Pressure"
                statusTone={toInstrumentTone(pressureBand?.key)}
              >
                <PressureGauge value={pressure} size={gaugeSize} />
              </InstrumentCard>

              <InstrumentCard
                style={{ flex: 1, minWidth: 0 }}
                title="Feed Tank"
                statusTone={tankDanger ? 'danger' : toInstrumentTone(tankBand?.key)}
              >
                <TankLevelGauge value={feedPct} width={tankW} height={tankH} />
              </InstrumentCard>
            </View>

            {/* KPIs */}
            <SectionHeader>Key performance indicators</SectionHeader>
            <View style={styles.wrap}>
              {baseKpis.map((k) => (
                <KpiCard key={k.label} width={colW(kpiCols)} label={k.label} unit={k.unit} value={k.value} tone={k.tone} trend={kpiTrend(k.label)} />
              ))}

              {/* Daily Production: database total for today, with the live permeate rate underneath */}
              <KpiCard
                width={colW(kpiCols)}
                label="Daily Production"
                unit="m³"
                value={dailyProduction === null ? '—' : Math.round(dailyProduction).toLocaleString()}
                tone={dailyProduction === null ? 'neutral' : 'nominal'}
                note={permeateNow === null ? undefined : `${permeateNow.toFixed(1)} m³/h now`}
              />

              {/* Feed Tank Raw: the transmitter signal (4.9 = 0 %, 10.0 = 100 %) and the % it converts to */}
              <KpiCard
                width={colW(kpiCols)}
                label="Feed Tank Raw"
                unit=""
                value={rawTank === null ? '—' : rawTank.toFixed(3)}
                tone="neutral"
                trend={kpiTrend('Feed Tank Raw')}
                note={feedPct === null ? undefined : `≈ ${feedPct.toFixed(1)}%`}
              />

              <KpiCard
                width={colW(kpiCols)}
                label="Service Run Hours"
                unit={serviceHrs === null ? '' : `${serviceHrs.toFixed(1)} hrs`}
                value={formatHours(serviceHrs)}
                tone={serviceHrs === null ? 'neutral' : 'info'}
              />
            </View>
          </>
        )}

        {tab === 'alerts' && (
          <SystemStatusPanel
            wide={wide}
            startup={[
              { label: 'Feed Pump', running: eq(feedPump) },
              { label: 'H.P. Pump', running: eq(hp) },
              { label: 'Dosing Pump', running: eq(dosing) },
            ]}
            banner={banner}
            rings={[
              { label: 'Feed Tank', value: feedPct, status: tankBand?.statusLabel ?? 'No data', tone: tankDanger ? 'danger' : toInstrumentTone(tankBand?.key) },
              { label: 'Recovery', value: recovery, status: hasFresh ? rec.label : 'No data', tone: hasFresh ? rec.tone : ('muted' as typeof rec.tone) },
              { label: 'RO Health', value: health.pct, status: health.label, tone: health.tone },
            ]}
            equipment={equipment}
            alarms={recentAlarms}
            onViewAll={() => setDrawerOpen(true)}
          />
        )}

        {tab === 'trends' && <TrendsPanel history={history} latest={num} wide={wide} />}
      </ScrollView>

      <AlarmDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        alarms={drawerAlarms}
        onAcknowledge={acknowledgeAlarm}
        onIsolate={handleIsolate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  statusSafe: { backgroundColor: colors.surfaceContainerLow },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  statusTitle: { fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  statusMeta: { color: colors.onSurfaceVariant, fontSize: 11, fontVariant: ['tabular-nums'] },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  hoursChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, height: 32, borderRadius: radii.md, backgroundColor: colors.surfaceContainerHigh },
  hoursChipText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 7, height: 7, borderRadius: 4 },
  refreshBtn: { width: 32, height: 32, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerHigh },

  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: 2, paddingBottom: spacing.sm + 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: radii.full, backgroundColor: colors.surfaceContainerHigh },
  tabOn: { backgroundColor: colors.primary },
  tabText: { color: colors.onSurfaceVariant, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  badge: { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: radii.full, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.onError, fontSize: 10, fontWeight: '700' },

  content: { padding: spacing.md, gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },

  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh },

  hero: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 4, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  heroLabel: { color: colors.onSurfaceVariant, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.full, borderWidth: 1 },
  heroChipText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  heroValue: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5, marginTop: 6, fontVariant: ['tabular-nums'] },
  heroSub: { color: colors.onSurfaceVariant, fontSize: 12 },
  heroRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.onSurfaceVariant, opacity: 0.3, marginVertical: spacing.sm },
  miniRow: { flexDirection: 'row', gap: spacing.sm },
  miniStat: { minWidth: 0, gap: 2 },
  miniLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniLabel: { color: colors.onSurfaceVariant, fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  miniValue: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  sectionHeader: { marginTop: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' },
  sectionRule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceContainerHigh, marginTop: 6 },

  kpiCard: { padding: spacing.sm + 4, gap: 6, minHeight: 96, overflow: 'hidden' },
  kpiHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiIcon: { width: 24, height: 24, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { flex: 1, color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  kpiValue: { flexShrink: 1, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  kpiUnit: { color: colors.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  kpiFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, minHeight: 16 },
  kpiTrend: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiTrendText: { color: colors.onSurfaceVariant, fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
  kpiNote: { flexShrink: 1, color: colors.tertiary, fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
});