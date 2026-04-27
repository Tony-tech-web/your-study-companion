import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT, shadow } from '../lib/theme';
import { getFullDashboardStats, getTasks, getActivity, FullStats } from '../services/dashboard';
import { Task, StudyActivity } from '../types';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_W = Math.floor((SCREEN_W - spacing.lg * 2 - spacing.md * 2 - 6 * 4) / 7);

const SkeletonBox = ({ w, h, r = radius.md }: { w: number | string; h: number; r?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: colors.card2 }} />
);

const DashboardSkeleton = () => (
  <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
    <SkeletonBox w="60%" h={32} r={radius.lg} />
    <SkeletonBox w="100%" h={80} r={radius.xl} />
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {[0,1,2,3].map(i => <SkeletonBox key={i} w={(SCREEN_W - spacing.lg * 2 - spacing.sm * 3) / 4} h={80} r={radius.xl} />)}
    </View>
    <SkeletonBox w="100%" h={160} r={radius.xl} />
    {[0,1,2].map(i => <SkeletonBox key={i} w="100%" h={64} r={radius.lg} />)}
    <View style={{ height: TAB_BAR_HEIGHT }} />
  </ScrollView>
);

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<FullStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<StudyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t, a] = await Promise.allSettled([getFullDashboardStats(), getTasks(), getActivity()]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') setTasks(t.value.slice(0, 5));
      if (a.status === 'fulfilled') setActivity(a.value);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const maxAct = Math.max(...activity.map(a => a.hours), 1);
  const xpPct = stats ? Math.min((stats.user.xp / stats.user.maxXp) * 100, 100) : 0;
  const displayName = stats?.user.name || user?.email?.split('@')[0] || 'Scholar';

  const STAT_TILES = [
    { icon: 'school-outline' as const, color: colors.blue,   value: stats?.currentGpa || '—',           label: 'GPA'    },
    { icon: 'flash-outline' as const,  color: colors.yellow, value: String(stats?.aiInteractions || 0), label: 'Sessions' },
    { icon: 'time-outline' as const,   color: colors.green,  value: `${stats?.studyMinutes || 0}`,      label: 'Mins'   },
    { icon: 'search-outline' as const, color: colors.primary, value: `${stats?.researchMinutes || 0}`,  label: 'Research' },
  ];

  if (loading) return <View style={s.root}><DashboardSkeleton /></View>;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Good day</Text>
            <Text style={s.name} numberOfLines={1}>{displayName}</Text>
          </View>
          <TouchableOpacity style={s.signOutBtn} onPress={signOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* XP Card */}
        <View style={s.xpCard}>
          <View style={s.xpRow}>
            <View style={s.levelBadge}>
              <Text style={s.levelText}>Lv {stats?.user.level || 1}</Text>
            </View>
            <Text style={s.xpLabel}>{stats?.user.xp || 0} / {stats?.user.maxXp || 200} XP</Text>
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <Text style={s.xpSub}>{xpPct.toFixed(0)}% to next level</Text>
        </View>

        {/* Stat tiles */}
        <View style={s.statsRow}>
          {STAT_TILES.map(t => (
            <View key={t.label} style={s.statTile}>
              <View style={[s.statIcon, { backgroundColor: t.color + '20' }]}>
                <Ionicons name={t.icon} size={16} color={t.color} />
              </View>
              <Text style={s.statValue}>{t.value}</Text>
              <Text style={s.statLabel}>{t.label}</Text>
            </View>
          ))}
        </View>

        {/* Activity chart */}
        <View style={s.chartCard}>
          <Text style={s.sectionTitle}>Weekly Activity</Text>
          <View style={s.chart}>
            {activity.map((a, i) => {
              const barH = maxAct > 0 ? Math.max((a.hours / maxAct) * 80, 4) : 4;
              return (
                <View key={i} style={s.barCol}>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: barH }]} />
                  </View>
                  <Text style={s.barDay}>{a.day?.slice(0,1)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent plans */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Plans</Text>
        </View>
        {tasks.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={28} color={colors.muted} style={{ opacity: 0.3 }} />
            <Text style={s.emptyText}>No study plans yet</Text>
          </View>
        ) : tasks.map(t => (
          <View key={t.id} style={s.taskRow}>
            <View style={s.taskDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.taskTitle} numberOfLines={1}>{t.title}</Text>
              <Text style={s.taskSub}>{t.category} · {t.dueDate}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} style={{ opacity: 0.4 }} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  greeting: { color: colors.muted, fontSize: typography.sm, fontWeight: fontWeight.medium },
  name: { color: colors.foreground, fontSize: typography['3xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.8, marginTop: 1 },
  signOutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  xpCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: spacing.sm },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: { backgroundColor: colors.primary + '20', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.bold },
  xpLabel: { color: colors.muted, fontSize: typography.xs },
  xpTrack: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  xpSub: { color: colors.muted, fontSize: typography.xs },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statTile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, gap: 4 },
  statIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { color: colors.foreground, fontSize: typography.xl, fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: typography.xs },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, marginTop: spacing.md },
  barCol: { alignItems: 'center', gap: 6, flex: 1 },
  barTrack: { width: 8, height: 80, backgroundColor: colors.border, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  barDay: { color: colors.muted, fontSize: 10, fontWeight: fontWeight.semibold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: fontWeight.semibold },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  taskTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  taskSub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  emptyCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  emptyText: { color: colors.muted, fontSize: typography.sm },
});
