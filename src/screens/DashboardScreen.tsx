import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getFullDashboardStats, getTasks, getActivity, FullStats } from '../services/dashboard';
import { Task, StudyActivity } from '../types';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View style={s.statCard}>
    <Text style={s.statValue}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {sub && <Text style={s.statSub}>{sub}</Text>}
  </View>
);

const ActivityBar = ({ day, hours, max }: { day: string; hours: number; max: number }) => {
  const h = max > 0 ? (hours / max) * 80 : 0;
  return (
    <View style={s.barWrap}>
      <View style={s.barTrack}>
        <View style={[s.barFill, { height: h }]} />
      </View>
      <Text style={s.barLabel}>{day}</Text>
    </View>
  );
};

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<FullStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<StudyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, t, a] = await Promise.allSettled([
        getFullDashboardStats(),
        getTasks(),
        getActivity(),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') setTasks(t.value.slice(0, 5));
      if (a.status === 'fulfilled') setActivity(a.value);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const maxActivity = Math.max(...activity.map(a => a.hours), 1);
  const xpProgress = stats ? (stats.user.xp / stats.user.maxXp) : 0;

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good day,</Text>
          <Text style={s.name}>{stats?.user.name || user?.email?.split('@')[0] || 'Scholar'} 👋</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* XP Bar */}
      <View style={s.xpCard}>
        <View style={s.xpRow}>
          <Text style={s.xpLabel}>Level {stats?.user.level || 1}</Text>
          <Text style={s.xpValue}>{stats?.user.xp || 0} / {stats?.user.maxXp || 200} XP</Text>
        </View>
        <View style={s.xpTrack}>
          <View style={[s.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <StatCard label="Current GPA" value={stats?.currentGpa || '—'} />
        <StatCard label="AI Sessions" value={String(stats?.aiInteractions || 0)} />
        <StatCard label="Study Mins" value={String(stats?.studyMinutes || 0)} />
        <StatCard label="Research" value={`${stats?.researchMinutes || 0}m`} />
      </View>

      {/* Activity Chart */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Weekly Activity</Text>
        <View style={s.chart}>
          {activity.map(a => (
            <ActivityBar key={a.day} day={a.day} hours={a.hours} max={maxActivity} />
          ))}
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Study Plans</Text>
        {tasks.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>No study plans yet</Text>
          </View>
        ) : tasks.map(task => (
          <View key={task.id} style={s.taskCard}>
            <View style={s.taskDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.taskTitle}>{task.title}</Text>
              <Text style={s.taskSub}>{task.category} · {task.dueDate}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  greeting: { color: colors.muted, fontSize: typography.sm },
  name: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: '800' },
  signOutBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  signOutText: { color: colors.muted, fontSize: typography.xs, fontWeight: '600' },
  xpCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  xpLabel: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  xpValue: { color: colors.muted, fontSize: typography.xs },
  xpTrack: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { color: colors.primary, fontSize: typography.xl, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  statSub: { color: colors.muted, fontSize: typography.xs, opacity: 0.6 },
  section: { marginBottom: spacing.lg },
  sectionTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '700', marginBottom: spacing.sm },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, height: 140 },
  barWrap: { alignItems: 'center', flex: 1 },
  barTrack: { height: 80, width: 8, backgroundColor: colors.border, borderRadius: radius.full, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { backgroundColor: colors.primary, width: '100%', borderRadius: radius.full },
  barLabel: { color: colors.muted, fontSize: 10, marginTop: 4 },
  taskCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  taskDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  taskTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  taskSub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  emptyWrap: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.muted, fontSize: typography.sm },
});
