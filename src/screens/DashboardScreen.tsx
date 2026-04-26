import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { colors, spacing, radius, typography, fontWeight, shadow } from '../lib/theme';
import { getFullDashboardStats, getTasks, getActivity } from '../services/dashboard';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, t, a] = await Promise.allSettled([getFullDashboardStats(), getTasks(), getActivity()]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (t.status === 'fulfilled') setTasks((t.value as any[]).slice(0, 5));
      if (a.status === 'fulfilled') setActivity(a.value as any[]);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const xpPct = stats ? Math.min((stats.user?.xp / stats.user?.maxXp) * 100, 100) : 0;
  const maxH = Math.max(...(activity.map((a: any) => a.hours) || [1]), 1);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        >
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Good day 👋</Text>
              <Text style={s.name}>{stats?.user?.name || user?.email?.split('@')[0] || 'Scholar'}</Text>
            </View>
            <TouchableOpacity style={s.avatar} onPress={signOut}>
              <Text style={s.avatarText}>{(stats?.user?.name || 'S')[0].toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          {/* XP Card */}
          <View style={[s.card, s.xpCard]}>
            <View style={s.xpTop}>
              <View>
                <Text style={s.xpLevel}>Level {stats?.user?.level || 1}</Text>
                <Text style={s.xpTitle}>{stats?.user?.title || 'Freshman Scholar'}</Text>
              </View>
              <View style={s.xpBadge}>
                <Text style={s.xpBadgeText}>{stats?.user?.xp || 0} XP</Text>
              </View>
            </View>
            <View style={s.xpTrack}>
              <View style={[s.xpFill, { width: `${xpPct}%` }]} />
            </View>
            <Text style={s.xpCaption}>{stats?.user?.xp || 0} / {stats?.user?.maxXp || 200} XP to next level</Text>
          </View>

          {/* Stats */}
          <Text style={s.sectionTitle}>Overview</Text>
          <View style={s.statsGrid}>
            {[
              { label: 'GPA', value: stats?.currentGpa || '—', icon: '🎓', color: colors.green },
              { label: 'AI Sessions', value: stats?.aiInteractions || 0, icon: '✨', color: colors.primary },
              { label: 'Study Mins', value: stats?.studyMinutes || 0, icon: '⏱', color: colors.blue },
              { label: 'Research', value: `${stats?.researchMinutes || 0}m`, icon: '🔍', color: colors.teal },
            ].map((item, i) => (
              <View key={i} style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: item.color + '20' }]}>
                  <Text style={s.statIconEmoji}>{item.icon}</Text>
                </View>
                <Text style={[s.statValue, { color: item.color }]}>{String(item.value)}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Activity */}
          <Text style={s.sectionTitle}>Weekly Activity</Text>
          <View style={s.card}>
            <View style={s.chart}>
              {activity.map((a: any) => {
                const h = maxH > 0 ? (a.hours / maxH) * 72 : 0;
                return (
                  <View key={a.day} style={s.barCol}>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { height: h }]} />
                    </View>
                    <Text style={s.barDay}>{a.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tasks */}
          <Text style={s.sectionTitle}>Recent Plans</Text>
          {tasks.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyText}>No study plans yet — create one in Planner</Text>
            </View>
          ) : (
            <View style={s.card}>
              {tasks.map((t: any, i: number) => (
                <View key={t.id} style={[s.taskRow, i < tasks.length - 1 && s.taskBorder]}>
                  <View style={s.taskDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.taskTitle}>{t.title}</Text>
                    <Text style={s.taskSub}>{t.category}</Text>
                  </View>
                  <Text style={s.taskDate}>{t.dueDate}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  greeting: { color: colors.muted, fontSize: typography.subheadline, fontWeight: fontWeight.regular },
  name: { color: colors.foreground, fontSize: typography.title2, fontWeight: fontWeight.black, letterSpacing: -0.5, marginTop: 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.sm },
  avatarText: { color: '#fff', fontSize: typography.body, fontWeight: fontWeight.bold },
  card: { backgroundColor: colors.cardSolid, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.borderSolid, marginBottom: spacing.md, ...shadow.sm },
  xpCard: { padding: spacing.md, marginBottom: spacing.lg },
  xpTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  xpLevel: { color: colors.foreground, fontSize: typography.headline, fontWeight: fontWeight.bold },
  xpTitle: { color: colors.muted, fontSize: typography.footnote, marginTop: 2 },
  xpBadge: { backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  xpBadgeText: { color: colors.primary, fontSize: typography.footnote, fontWeight: fontWeight.bold },
  xpTrack: { height: 6, backgroundColor: colors.surface, borderRadius: radius.full, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  xpCaption: { color: colors.muted, fontSize: typography.caption1, marginTop: spacing.xs },
  sectionTitle: { color: colors.secondaryLabel, fontSize: typography.footnote, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderSolid, alignItems: 'center', gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  statIconEmoji: { fontSize: 16 },
  statValue: { fontSize: typography.title3, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  statLabel: { color: colors.muted, fontSize: typography.caption2, fontWeight: fontWeight.medium, textAlign: 'center' },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { width: 8, height: 72, backgroundColor: colors.surface, borderRadius: radius.full, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { backgroundColor: colors.primary, width: '100%', borderRadius: radius.full },
  barDay: { color: colors.muted, fontSize: typography.caption2 },
  emptyCard: { backgroundColor: colors.cardSolid, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.borderSolid },
  emptyText: { color: colors.muted, fontSize: typography.footnote, textAlign: 'center' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  taskBorder: { borderBottomWidth: 1, borderBottomColor: colors.separator },
  taskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  taskTitle: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.medium },
  taskSub: { color: colors.muted, fontSize: typography.caption1, marginTop: 2 },
  taskDate: { color: colors.muted, fontSize: typography.caption1 },
});
