// src/app/TagManagerScreen.tsx — every tag the backend sends: live value, status, history. Add your own.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Alert, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Screen from '../components/Screen';
import { HeaderButton } from '../components/AppHeader';
import { MiniLineChart } from '../components/TankParts';
import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import { C } from '../components/ui';
import { SENSORS } from '../data/sensors';
import { EXTRA_SENSORS, EQUIPMENT_TAGS } from '../data/extraSensors';
import { PLC_ALARMS } from '../lib/plcAlarms';
import { MAX_CUSTOM_TAGS, addCustomTag, removeCustomTag, useCustomTags } from '../state/customTags';
import { useTags } from '../state/useTags';
import { useSession } from '../state/session';
import { toChartNumber } from '../state/liveData';
import { canOperate } from '../lib/auth';
import { isActive } from '../lib/status';
import { fmtClock, toPts } from '../lib/trendMath';
import { bucketize, mean, uptimePct } from '../lib/analytics';

type Group = 'Sensors' | 'Equipment' | 'Alarms' | 'Custom';
type Kind = 'number' | 'bit' | 'text';
type Entry = { tag: string; label: string; unit: string; group: Group; kind: Kind; decimals: number; custom?: boolean };
type Filter = 'all' | 'online' | 'nodata' | Group;

const GROUPS: Group[] = ['Sensors', 'Equipment', 'Alarms', 'Custom'];
const GROUP_ICON: Record<Group, keyof typeof MaterialIcons.glyphMap> = { Sensors: 'sensors', Equipment: 'precision-manufacturing', Alarms: 'notification-important', Custom: 'bookmark-border' };
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'online', label: 'Online' }, { key: 'nodata', label: 'No data' },
  { key: 'Sensors', label: 'Sensors' }, { key: 'Equipment', label: 'Equipment' }, { key: 'Alarms', label: 'Alarms' }, { key: 'Custom', label: 'Custom' },
];

const kindOf = (tag: string): Kind => (tag === 'RO5-SystemActive' ? 'bit' : tag === 'RO5-SystemOperation' || tag === 'RO5-SystemMode' ? 'text' : 'number');
const alarmTags = new Set(PLC_ALARMS.map((a) => a.tag));

function buildEntries(custom: { tag: string; label: string; unit: string }[]): Entry[] {
  return [
    ...SENSORS.map((s) => ({ tag: s.tag, label: s.label, unit: s.unit, group: 'Sensors' as Group, kind: kindOf(s.tag), decimals: s.decimals })),
    ...EXTRA_SENSORS.map((s) => ({ tag: s.tag, label: s.label, unit: s.unit, group: 'Sensors' as Group, kind: 'number' as Kind, decimals: s.decimals })),
    { tag: 'RO5-SystemMode', label: 'System Mode', unit: '', group: 'Sensors' as Group, kind: 'text' as Kind, decimals: 0 },
    ...EQUIPMENT_TAGS.map((e) => alarmTags.has(e.tag)
      ? { tag: e.tag, label: e.label.replace(/^Alarm:\s*/, ''), unit: '', group: 'Alarms' as Group, kind: 'bit' as Kind, decimals: 0 }
      : { tag: e.tag, label: e.label, unit: '', group: 'Equipment' as Group, kind: 'bit' as Kind, decimals: 0 }),
    ...custom.map((c) => ({ ...c, group: 'Custom' as Group, kind: 'number' as Kind, decimals: 2, custom: true })),
  ];
}

/** How a value is shown: numbers with unit, bits as ON/OFF (alarms: Active/Clear), text as-is. */
function view(e: Entry, v: unknown): { text: string; unit: string; color: string; pill: boolean } {
  if (v === null || v === undefined) return { text: 'No data', unit: '', color: C.grey, pill: false };
  if (e.kind === 'bit') {
    const on = isActive(v);
    if (e.group === 'Alarms') return on ? { text: 'Active', unit: '', color: C.red, pill: true } : { text: 'Clear', unit: '', color: C.green, pill: true };
    return on ? { text: 'ON', unit: '', color: C.green, pill: true } : { text: 'OFF', unit: '', color: C.grey, pill: true };
  }
  if (e.kind === 'text') return { text: String(v), unit: '', color: C.blue, pill: true };
  const n = toChartNumber(v);
  return { text: n === null ? String(v) : n.toFixed(e.decimals), unit: e.unit, color: colors.onSurface, pill: false };
}

const ago = (ts?: string) => {
  if (!ts) return '—';
  const sec = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  return sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.floor(sec / 60)}m ago` : `${Math.floor(sec / 3600)}h ago`;
};

export default function TagManagerScreen() {
  const { raw, history, live } = useTags();
  const custom = useCustomTags().tags;
  const operate = canOperate(useSession().user?.role);

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<Entry | null>(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ tag: '', label: '', unit: '' });
  const [copied, setCopied] = useState(false);

  const entries = useMemo(() => buildEntries(custom), [custom]);
  const rows = entries.map((e) => ({ e, v: raw(e.tag) }));
  const online = rows.filter((r) => r.v !== null).length;

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(({ e, v }) =>
    (!needle || `${e.tag} ${e.label}`.toLowerCase().includes(needle)) &&
    (filter === 'all' || (filter === 'online' ? v !== null : filter === 'nodata' ? v === null : e.group === filter)));

  const save = () => {
    const tag = f.tag.trim();
    if (!tag) return Alert.alert('Tag address needed', 'Enter the PLC tag, for example RO5-FEEDFlow.');
    if (entries.some((e) => e.tag === tag)) return Alert.alert('Already added', 'That tag is already in the list.');
    if (!addCustomTag({ tag, label: f.label.trim() || tag, unit: f.unit.trim() })) return Alert.alert('Limit reached', `You can add up to ${MAX_CUSTOM_TAGS} custom tags.`);
    setF({ tag: '', label: '', unit: '' }); setForm(false);
  };

  const copy = async (tag: string) => { await Clipboard.setStringAsync(tag); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  /* ---- detail sheet data ---- */
  const detail = (() => {
    if (!sel) return null;
    const v = raw(sel.tag);
    const meta = live.meta?.(sel.tag);
    const cut = Date.now() - 24 * 3_600_000;
    const pts = toPts(history[sel.tag]).filter((p) => p.t >= cut);
    const line = sel.kind === 'number' ? bucketize(pts, cut, Date.now(), 12, (b) => mean(b)).filter((b) => b.v !== null).map((b) => ({ label: fmtClock(b.t1), value: b.v as number })) : [];
    const share = sel.kind === 'bit' ? uptimePct(pts) : null;
    return { v, disp: view(sel, v), updated: ago(meta?.timestamp), line, share, samples: pts.length };
  })();

  return (
    <Screen title="Tag Manager" subtitle={`${online} of ${entries.length} tags reporting`} right={operate ? <HeaderButton icon="add" label="Add tag" onPress={() => setForm(true)} /> : undefined}>
      {/* Search */}
      <View style={s.search}>
        <MaterialIcons name="search" size={20} color={colors.onSurfaceVariant} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search by name or tag" placeholderTextColor={colors.onSurfaceVariant} style={s.input} autoCapitalize="none" autoCorrect={false} accessibilityLabel="Search tags" />
        {!!q && <Pressable onPress={() => setQ('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search"><MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} /></Pressable>}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {FILTERS.map((x) => (
          <Pressable key={x.key} onPress={() => setFilter(x.key)} style={[s.chip, filter === x.key && s.chipOn]} accessibilityRole="button" accessibilityState={{ selected: filter === x.key }}>
            <Text style={[s.chipText, filter === x.key && { color: '#fff' }]}>{x.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Groups */}
      {shown.length === 0 && (
        <View style={s.empty}>
          <MaterialIcons name="search-off" size={30} color={colors.outline} />
          <Text style={s.emptyTitle}>No tags found</Text>
          <Text style={s.emptySub}>{q ? `Nothing matches “${q}”.` : 'Nothing in this filter.'}</Text>
        </View>
      )}
      {GROUPS.map((g) => {
        const list = shown.filter((r) => r.e.group === g);
        if (!list.length) return null;
        return (
          <View key={g} style={{ gap: 8 }}>
            <View style={s.groupHead}>
              <MaterialIcons name={GROUP_ICON[g]} size={14} color={colors.onSurfaceVariant} />
              <Text style={s.groupTitle}>{g.toUpperCase()}</Text>
              <Text style={s.groupCount}>{list.length}</Text>
            </View>
            <View style={s.card}>
              {list.map(({ e, v }, i) => {
                const d = view(e, v);
                return (
                  <Pressable key={e.tag} onPress={() => setSel(e)} style={({ pressed }) => [s.row, i === list.length - 1 && { borderBottomWidth: 0 }, pressed && { opacity: 0.6 }]}
                    accessibilityRole="button" accessibilityLabel={`${e.label}, ${d.text} ${d.unit}`}>
                    <View style={[s.statusDot, { backgroundColor: v === null ? C.grey : C.green }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.label} numberOfLines={1}>{e.label}</Text>
                      <Text style={s.code} numberOfLines={1}>{e.tag}</Text>
                    </View>
                    {d.pill ? (
                      <View style={[s.pill, { backgroundColor: `${d.color}22` }]}><Text style={[s.pillText, { color: d.color }]}>{d.text}</Text></View>
                    ) : (
                      <View style={s.valueBox}>
                        <Text style={[s.value, { color: d.color }]} numberOfLines={1}>{d.text}</Text>
                        {!!d.unit && <Text style={s.unit}>{d.unit}</Text>}
                      </View>
                    )}
                    <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Detail sheet */}
      <Modal visible={!!sel} transparent animationType="slide" onRequestClose={() => setSel(null)}>
        <Pressable style={s.scrim} onPress={() => setSel(null)} accessibilityLabel="Close details">
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <SafeAreaView edges={['bottom']} style={s.sheet}>
              {sel && detail && (
                <>
                  <View style={s.grab} />
                  <View style={s.sheetHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetTitle} numberOfLines={1}>{sel.label}</Text>
                      <Text style={s.code}>{sel.group}{sel.custom ? ' · custom' : ''}</Text>
                    </View>
                    <Pressable onPress={() => setSel(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} /></Pressable>
                  </View>

                  <View style={s.bigRow}>
                    <Text style={[s.big, { color: detail.disp.color }]}>{detail.disp.text}</Text>
                    {!!detail.disp.unit && <Text style={s.bigUnit}>{detail.disp.unit}</Text>}
                    <View style={{ flex: 1 }} />
                    <Text style={s.code}>Updated {detail.updated}</Text>
                  </View>

                  <Pressable style={s.tagBox} onPress={() => copy(sel.tag)} accessibilityRole="button" accessibilityLabel={`Copy ${sel.tag}`}>
                    <Text style={s.tagBoxText} numberOfLines={1} selectable>{sel.tag}</Text>
                    <View style={s.copyBtn}>
                      <MaterialIcons name={copied ? 'check' : 'content-copy'} size={14} color={copied ? C.green : colors.primary} />
                      <Text style={[s.copyText, copied && { color: C.green }]}>{copied ? 'Copied' : 'Copy'}</Text>
                    </View>
                  </Pressable>

                  {sel.kind === 'number' && (
                    detail.line.length > 1
                      ? <View><Text style={s.section}>LAST 24 HOURS</Text><MiniLineChart data={detail.line} color={C.blue} height={110} fmt={(x) => x.toFixed(sel.decimals > 1 ? 1 : 0)} /></View>
                      : <Text style={s.emptySub}>Not enough history yet. Keep the app open for a few minutes.</Text>
                  )}
                  {sel.kind === 'bit' && (
                    <Text style={s.emptySub}>{detail.share === null ? 'Not enough history yet.' : `${sel.group === 'Alarms' ? 'Active' : 'ON'} ${detail.share.toFixed(0)}% of the recorded time (last 24 h).`}</Text>
                  )}

                  {sel.custom && operate && (
                    <Pressable style={s.remove} onPress={() => { removeCustomTag(sel.tag); setSel(null); }} accessibilityRole="button" accessibilityLabel={`Remove ${sel.tag}`}>
                      <MaterialIcons name="delete-outline" size={18} color={C.red} /><Text style={s.removeText}>Remove this tag</Text>
                    </Pressable>
                  )}
                </>
              )}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add tag */}
      <Modal visible={form} transparent animationType="slide" onRequestClose={() => setForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.scrim}>
          <SafeAreaView edges={['bottom']} style={s.sheet}>
            <View style={s.grab} />
            <View style={s.sheetHead}>
              <Text style={[s.sheetTitle, { flex: 1 }]}>Add a tag</Text>
              <Pressable onPress={() => setForm(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} /></Pressable>
            </View>
            <Text style={s.emptySub}>Use the exact tag name the backend sends, for example RO5-FEEDFlow.</Text>
            {([['tag', 'Tag address'], ['label', 'Name (optional)'], ['unit', 'Unit (optional)']] as const).map(([k, ph]) => (
              <TextInput key={k} value={f[k]} onChangeText={(t) => setF({ ...f, [k]: t })} placeholder={ph} placeholderTextColor={colors.onSurfaceVariant} style={s.field} autoCapitalize="none" autoCorrect={false} accessibilityLabel={ph} />
            ))}
            <Pressable style={s.cta} onPress={save} accessibilityRole="button"><Text style={s.ctaText}>Save tag</Text></Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: radii.lg, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.surfaceContainerHigh },
  input: { flex: 1, color: colors.onSurface, fontFamily: FONT.body, fontSize: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceContainerHigh },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.onSurfaceVariant },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  groupTitle: { fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, color: colors.onSurfaceVariant },
  groupCount: { fontFamily: FONT.mono, fontSize: 10, color: colors.outline },
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surfaceContainerHigh, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceContainerHigh },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontFamily: FONT.semibold, fontSize: 14, color: colors.onSurface },
  code: { fontFamily: FONT.mono, fontSize: 10.5, color: colors.onSurfaceVariant, marginTop: 2 },
  valueBox: { alignItems: 'flex-end', maxWidth: 120 },
  value: { fontFamily: FONT.monoBold, fontSize: 15 },
  unit: { fontFamily: FONT.mono, fontSize: 10, color: colors.onSurfaceVariant },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  pillText: { fontFamily: FONT.monoBold, fontSize: 11 },

  empty: { alignItems: 'center', gap: 6, paddingVertical: 40 },
  emptyTitle: { fontFamily: FONT.semibold, fontSize: 15, color: colors.onSurface },
  emptySub: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surfaceContainerLow, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: spacing.md, gap: 14 },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surfaceContainerHighest },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetTitle: { fontFamily: FONT.heading, fontSize: 18, color: colors.onSurface },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  big: { fontFamily: FONT.monoBold, fontSize: 34 },
  bigUnit: { fontFamily: FONT.mono, fontSize: 13, color: colors.onSurfaceVariant },
  tagBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radii.md, backgroundColor: colors.surfaceContainerHigh },
  tagBoxText: { flex: 1, fontFamily: FONT.mono, fontSize: 12, color: colors.onSurface },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontFamily: FONT.semibold, fontSize: 12, color: colors.primary },
  section: { fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: colors.onSurfaceVariant, marginBottom: 6 },
  remove: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: radii.md, borderWidth: 1, borderColor: colors.error },
  removeText: { fontFamily: FONT.semibold, fontSize: 13, color: colors.error },
  field: { height: 48, borderRadius: radii.md, paddingHorizontal: 14, backgroundColor: colors.surfaceContainerHigh, color: colors.onSurface, fontFamily: FONT.body, fontSize: 14 },
  cta: { height: 50, borderRadius: radii.lg, backgroundColor: '#0877b8', alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: FONT.heading, fontSize: 15, color: '#fff' },
});