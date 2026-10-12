// src/app/ReportsScreen.tsx
import React, { useMemo, useState, useContext } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarHeightContext } from 'expo-router/js-tabs';

import { colors, radii, spacing } from '../theme/tokens';
import { FONT } from '../theme/fonts';
import AppHeader from '../components/AppHeader';
import { useTags } from '../state/useTags';
import { exportReport, Table } from '../lib/reports'; // Your existing utility

const CATEGORIES = ['All', 'Production', 'Performance', 'Quality', 'Maintenance', 'Chemical', 'Operations'];
const DECIMALS = 2;

const toNumber = (raw: any) => {
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (raw: any) => toNumber(raw).toFixed(DECIMALS);

// All the tags shown on the website's report
const SENSOR_TAGS = [
  { tag: 'RO5-FEEDFlow', label: 'Feed Flow', unit: 'm³/h', type: 'Float' },
  { tag: 'RO5-Permeateflow', label: 'Product Flow', unit: 'm³/h', type: 'Float' },
  { tag: 'RO5-ConcetrateFlow', label: 'Reject Flow', unit: 'm³/h', type: 'Float' },
  { tag: 'RO5-PureWaterEc', label: 'Product EC', unit: 'µS/cm', type: 'Float' },
  { tag: 'RO5-MediaFilterDeltaP', label: 'Media Filter ΔP', unit: 'bar', type: 'Float' },
  { tag: 'RO5-ROPressure', label: 'RO Feed Pressure', unit: 'bar', type: 'Float' },
  { tag: 'RO5-Stage1Delta', label: '1st Stage ΔP', unit: 'bar', type: 'Float' },
  { tag: 'RO5-Stage2Delta', label: '2nd Stage ΔP', unit: 'bar', type: 'Float' },
  { tag: 'RO5-FeedTankLevelRaw', label: 'Feed Tank Level', unit: '%', type: 'Float' },
  { tag: 'RO5-InterstagePress', label: 'Interstage Pressure', unit: 'bar', type: 'Float' },
  { tag: 'RO5-ConcetratePress', label: 'Concentrate Pressure', unit: 'bar', type: 'Float' },
  { tag: 'RO5-HighMediaDeltaP', label: 'Filter Inlet Pressure', unit: 'bar', type: 'Float' },
  { tag: 'RO5-HighPrefilterDeltaP', label: 'Filter Outlet Pressure', unit: 'bar', type: 'Float' },
  { tag: 'RO5-SystemRecovery', label: 'System Recovery', unit: '%', type: 'Float' },
];

type Report = {
  id: string;
  title: string;
  date: string;
  type: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  category: string;
  size: string;
  summary: string;
  data: Record<string, any>;
};

export default function ReportsScreen() {
  const { num, history, lastUpdate, live } = useTags();
  const tabBarH = useContext(BottomTabBarHeightContext) ?? 0;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // ---- Build Reports (Same logic as website) ----
  const reports: Report[] = useMemo(() => {
    const feedFlow = toNumber(num('RO5-FEEDFlow'));
    const permeateFlow = toNumber(num('RO5-Permeateflow'));
    const concentrateFlow = toNumber(num('RO5-ConcetrateFlow'));
    const roPressure = toNumber(num('RO5-ROPressure'));
    const recovery = toNumber(num('RO5-SystemRecovery'));
    const pureWaterEC = toNumber(num('RO5-PureWaterEc'));
    const stage1Delta = toNumber(num('RO5-Stage1Delta'));
    const stage2Delta = toNumber(num('RO5-Stage2Delta'));
    const filterDeltaP = toNumber(num('RO5-MediaFilterDeltaP'));

    const feedHistory = history['RO5-FEEDFlow'] || [];
    const permeateHistory = history['RO5-Permeateflow'] || [];

    const dailyAvg = (data: any[]) => {
      if (data.length === 0) return 0;
      const last24h = data.filter((d) => new Date(d.t).getTime() >= Date.now() - 86400000);
      return last24h.reduce((sum, d) => sum + toNumber(d.v), 0) / (last24h.length || 1);
    };

    const avgFeed = dailyAvg(feedHistory);
    const avgPermeate = dailyAvg(permeateHistory);

    const today = new Date().toISOString().split('T')[0];

    return [
      {
        id: 'RPT-DAILY-001',
        title: 'Daily Operations Report',
        date: today,
        type: 'Daily',
        category: 'Operations',
        size: '156 KB',
        summary: `Feed: ${fmt(feedFlow)} m³/h | Permeate: ${fmt(permeateFlow)} m³/h | Recovery: ${fmt(recovery)}%`,
        data: { feed: feedFlow, permeate: permeateFlow, concentrate: concentrateFlow, recovery, pressure: roPressure, ec: pureWaterEC },
      },
      {
        id: 'RPT-DAILY-002',
        title: 'System Performance Report',
        date: today,
        type: 'Daily',
        category: 'Performance',
        size: '218 KB',
        summary: `RO Pressure: ${fmt(roPressure)} bar | Stage 1 ΔP: ${fmt(stage1Delta)} bar | Filter ΔP: ${fmt(filterDeltaP)} bar`,
        data: { roPressure, interstagePress: toNumber(num('RO5-InterstagePress')), concentratePress: toNumber(num('RO5-ConcetratePress')), stage1Delta, stage2Delta, filterDeltaP },
      },
      {
        id: 'RPT-DAILY-003',
        title: 'Water Quality Report',
        date: today,
        type: 'Daily',
        category: 'Quality',
        size: '89 KB',
        summary: `Product EC: ${fmt(pureWaterEC)} µS/cm | Recovery: ${fmt(recovery)}%`,
        data: { pureWaterEC, recovery, feedFlow, permeateFlow },
      },
      {
        id: 'RPT-WEEKLY-001',
        title: 'Weekly Production Summary',
        date: today,
        type: 'Weekly',
        category: 'Production',
        size: '380 KB',
        summary: `Avg Feed: ${fmt(avgFeed)} m³/h | Avg Permeate: ${fmt(avgPermeate)} m³/h`,
        data: { avgFeed, avgPermeate, avgRecovery: recovery, totalProduction: avgPermeate * 24 * 7 },
      },
      {
        id: 'RPT-WEEKLY-002',
        title: 'Maintenance Summary',
        date: today,
        type: 'Weekly',
        category: 'Maintenance',
        size: '290 KB',
        summary: `Stage 1 ΔP: ${fmt(stage1Delta)} bar | Filter ΔP: ${fmt(filterDeltaP)} bar`,
        data: { stage1Delta, stage2Delta, filterDeltaP, roPressure },
      },
      {
        id: 'RPT-MONTHLY-001',
        title: 'Monthly Chemical Usage',
        date: today,
        type: 'Monthly',
        category: 'Chemical',
        size: '654 KB',
        summary: `Based on ${fmt(permeateFlow)} m³/h production rate`,
        data: { antiscalant: permeateFlow * 24 * 30 * 0.02, biocide: permeateFlow * 24 * 30 * 0.005, permeateFlow, recovery },
      },
      {
        id: 'RPT-QUARTERLY-001',
        title: 'Q2 2026 Performance Report',
        date: today,
        type: 'Quarterly',
        category: 'Performance',
        size: '1.2 MB',
        summary: `Avg Recovery: ${fmt(recovery)}% | System Efficiency: ${fmt(recovery * 0.95)}%`,
        data: { avgRecovery: recovery, avgProduction: permeateFlow * 24 * 90, efficiency: recovery * 0.95 },
      },
    ];
  }, [num, history]);

  const filteredReports = useMemo(() => {
    if (selectedCategory === 'All') return reports;
    return reports.filter((r) => r.category === selectedCategory);
  }, [reports, selectedCategory]);

  // ---- Build the REAL report table (same as website PDF) ----
  const buildRealReportTable = (report: Report): Table => {
    const head = ['Tag Name', 'Topic', 'Value', 'Unit', 'Type', 'Status', 'Last Update'];
    
    // Filter tags by category if needed, otherwise show all
    let tagsToShow = SENSOR_TAGS;
    if (report.category === 'Performance') {
      tagsToShow = SENSOR_TAGS.filter(t => 
        t.label.includes('Pressure') || t.label.includes('ΔP') || t.label.includes('Stage')
      );
    } else if (report.category === 'Quality') {
      tagsToShow = SENSOR_TAGS.filter(t => 
        t.label.includes('EC') || t.label.includes('Recovery')
      );
    } else if (report.category === 'Production') {
      tagsToShow = SENSOR_TAGS.filter(t => 
        t.label.includes('Flow') || t.label.includes('Recovery')
      );
    }

    const rows = tagsToShow.map((sensor) => {
      const rawValue = live.get(sensor.tag);
      const value = rawValue === null || rawValue === undefined ? '—' : 
                    typeof rawValue === 'number' ? rawValue.toFixed(DECIMALS) : String(rawValue);
      
      const meta = live.meta(sensor.tag);
      const lastUpdateStr = meta?.timestamp ? new Date(meta.timestamp).toLocaleTimeString() : '—';
      
      // Determine status (simplified - you can expand this)
      let status = 'Normal';
      if (rawValue === null || rawValue === undefined) status = 'No data';
      else if (sensor.tag === 'RO5-PureWaterEc' && toNumber(rawValue) > 50) status = 'High';
      else if (sensor.tag.includes('DeltaP') && toNumber(rawValue) > 1.0) status = 'High';

      // Build the "Topic" string like the website (plant/ro1/feed_flow)
      const topic = `plant/ro1/${sensor.tag.replace('RO5-', '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')}`;

      return [
        sensor.label,
        topic,
        value,
        sensor.unit,
        sensor.type,
        status,
        lastUpdateStr,
      ];
    });

    return {
      title: report.title,
      head,
      rows,
    };
  };

  // ---- Export Handler ----
  const handleExport = async (report: Report, format: 'pdf' | 'csv') => {
    setIsGenerating(`${report.id}-${format}`);
    try {
      const table = buildRealReportTable(report);
      const filename = `${report.id}_${report.title.replace(/\s+/g, '_')}`;
      await exportReport(filename, format, [table]);
    } catch (e) {
      console.error(`${format.toUpperCase()} Export failed`, e);
      Alert.alert('Error', `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <View style={s.root}>
      <AppHeader title="Reports" />
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: tabBarH + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>Reports & Analytics</Text>
          <Text style={s.headerSub}>
            {reports.length} reports available • Last updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '--'}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[s.chip, selectedCategory === cat && s.chipActive]}
            >
              <Text style={[s.chipText, selectedCategory === cat && s.chipTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.list}>
          {filteredReports.map((report) => (
            <View key={report.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.row}>
                  <MaterialIcons name="description" size={16} color={colors.primary} />
                  <Text style={s.cardTitle}>{report.title}</Text>
                </View>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{report.type.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={s.cardSummary}>{report.summary}</Text>
              
              <View style={s.cardMeta}>
                <Text style={s.metaText}>{report.id}</Text>
                <Text style={s.metaText}>{report.date}</Text>
                <Text style={s.metaText}>{report.size}</Text>
              </View>

              <View style={s.cardActions}>
                <Pressable
                  style={s.actionBtn}
                  onPress={() => handleExport(report, 'pdf')}
                  disabled={isGenerating === `${report.id}-pdf`}
                >
                  {isGenerating === `${report.id}-pdf` ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <MaterialIcons name="download" size={14} color={colors.primary} />
                      <Text style={s.actionText}>PDF</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={[s.actionBtn, s.actionBtnSecondary]}
                  onPress={() => handleExport(report, 'csv')}
                  disabled={isGenerating === `${report.id}-csv`}
                >
                  {isGenerating === `${report.id}-csv` ? (
                    <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
                  ) : (
                    <>
                      <MaterialIcons name="table-view" size={14} color={colors.onSurfaceVariant} />
                      <Text style={[s.actionText, { color: colors.onSurfaceVariant }]}>CSV</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {filteredReports.length === 0 && (
          <View style={s.empty}>
            <MaterialIcons name="folder-off" size={32} color={colors.onSurfaceVariant} />
            <Text style={s.emptyText}>No reports found for this category.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  
  headerInfo: { gap: 4 },
  headerTitle: { fontFamily: FONT.heading, fontSize: 18, color: colors.onSurface },
  headerSub: { fontFamily: FONT.body, fontSize: 12, color: colors.onSurfaceVariant },

  filterRow: { gap: spacing.sm, paddingBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: FONT.medium, fontSize: 12, color: colors.onSurfaceVariant },
  chipTextActive: { color: '#fff' },

  list: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: FONT.semibold, fontSize: 14, color: colors.onSurface },
  badge: { backgroundColor: `${colors.primary}22`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontFamily: FONT.mono, fontSize: 9, color: colors.primary, fontWeight: '700' },
  
  cardSummary: { fontFamily: FONT.body, fontSize: 11, color: colors.onSurfaceVariant, lineHeight: 16 },
  
  cardMeta: { flexDirection: 'row', gap: spacing.md, opacity: 0.7 },
  metaText: { fontFamily: FONT.mono, fontSize: 9, color: colors.onSurfaceVariant },

  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  actionBtnSecondary: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.surfaceContainerHigh,
  },
  actionText: { fontFamily: FONT.semibold, fontSize: 11, color: colors.primary },

  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyText: { fontFamily: FONT.body, fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' },
});