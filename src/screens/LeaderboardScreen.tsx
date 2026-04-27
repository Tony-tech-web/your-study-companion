import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography, fontWeight, TAB_BAR_HEIGHT } from '../lib/theme';
import { getLeaderboard, LeaderboardResult } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';

const SkeletonBox = ({ h = 64, r = radius.lg }: { h?: number; r?: number }) => (
  <View style={{ height: h, borderRadius: r, backgroundColor: colors.card, marginBottom: spacing.sm }} />
);

const RANK_COLORS = [colors.yellow, colors.muted, colors.orange || '#cd7f32'];
const RANK_BG    = ['rgba(255,214,10,0.15)', 'rgba(142,142,147,0.12)', 'rgba(205,127,50,0.12)'];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try { setError(null); setResult(await getLeaderboard()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}><Text style={s.title}>Leaderboard</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        <SkeletonBox h={90} r={radius.xl} />
        <SkeletonBox h={140} r={radius.xl} />
        {[0,1,2,3,4].map(i => <SkeletonBox key={i} />)}
      </ScrollView>
    </View>
  );

  if (error || !result) return (
    <View style={[s.root, s.center, { paddingTop: insets.top }]}>
      <Ionicons name="trophy-outline" size={48} color={colors.muted} style={{ opacity: 0.3, marginBottom: spacing.md }} />
      <Text style={s.errTitle}>Leaderboard unavailable</Text>
      <Text style={s.errSub}>{error || 'No data'}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
        <Text style={s.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const { entries, myRank } = result;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Leaderboard</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: TAB_BAR_HEIGHT + spacing.lg }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* My rank */}
        {myRank && (
          <View style={s.myCard}>
            <View style={s.myRankCircle}>
              <Text style={s.myRankNum}>#{myRank.rank}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.myCardLabel}>Your Rank</Text>
              <Text style={s.myCardXp}>{myRank.xp.toLocaleString()} XP · {myRank.title}</Text>
            </View>
            <View style={s.levelPill}>
              <Text style={s.levelPillText}>Lv {myRank.level}</Text>
            </View>
          </View>
        )}

        {/* Podium — no emojis, styled ranks */}
        {top3.length > 0 && (
          <View style={s.podium}>
            {/* 2nd */}
            {top3[1] && (
              <View style={[s.podiumSlot, { marginTop: 28 }]}>
                <View style={[s.podiumRank, { backgroundColor: RANK_BG[1] }]}>
                  <Text style={[s.podiumRankNum, { color: RANK_COLORS[1] }]}>2</Text>
                </View>
                <Image source={{ uri: top3[1].avatar }} style={s.podiumAvatar} />
                <Text style={s.podiumName} numberOfLines={1}>{top3[1].name}</Text>
                <Text style={s.podiumXp}>{top3[1].xp.toLocaleString()} XP</Text>
                <View style={[s.podiumBase, { height: 60, backgroundColor: RANK_BG[1] }]} />
              </View>
            )}
            {/* 1st */}
            {top3[0] && (
              <View style={s.podiumSlot}>
                <View style={[s.podiumRank, { backgroundColor: RANK_BG[0], width: 32, height: 32, borderRadius: 16 }]}>
                  <Text style={[s.podiumRankNum, { color: RANK_COLORS[0], fontSize: 15 }]}>1</Text>
                </View>
                <Image source={{ uri: top3[0].avatar }} style={[s.podiumAvatar, s.podiumAvatarFirst]} />
                <Text style={[s.podiumName, { color: RANK_COLORS[0], fontWeight: fontWeight.bold }]} numberOfLines={1}>{top3[0].name}</Text>
                <Text style={[s.podiumXp, { color: RANK_COLORS[0] }]}>{top3[0].xp.toLocaleString()} XP</Text>
                <View style={[s.podiumBase, { height: 90, backgroundColor: RANK_BG[0] }]} />
              </View>
            )}
            {/* 3rd */}
            {top3[2] && (
              <View style={[s.podiumSlot, { marginTop: 44 }]}>
                <View style={[s.podiumRank, { backgroundColor: RANK_BG[2] }]}>
                  <Text style={[s.podiumRankNum, { color: RANK_COLORS[2] }]}>3</Text>
                </View>
                <Image source={{ uri: top3[2].avatar }} style={s.podiumAvatar} />
                <Text style={s.podiumName} numberOfLines={1}>{top3[2].name}</Text>
                <Text style={s.podiumXp}>{top3[2].xp.toLocaleString()} XP</Text>
                <View style={[s.podiumBase, { height: 44, backgroundColor: RANK_BG[2] }]} />
              </View>
            )}
          </View>
        )}

        {/* Ranked list */}
        {rest.map((entry) => {
          const isMe = entry.user_id === user?.id;
          return (
            <View key={entry.id} style={[s.row, isMe && s.rowMe]}>
              <View style={s.rankBox}>
                <Text style={s.rankNum}>{entry.rank}</Text>
              </View>
              <Image source={{ uri: entry.avatar }} style={s.rowAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowName} numberOfLines={1}>
                  {entry.name}{isMe ? ' · You' : ''}
                </Text>
                <Text style={s.rowSub}>{entry.title || `Level ${entry.level}`}</Text>
              </View>
              <Text style={s.rowXp}>{entry.xp.toLocaleString()}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.5 },
  content: { padding: spacing.lg, gap: spacing.sm },
  myCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary + '40' },
  myRankCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  myRankNum: { color: colors.primary, fontSize: typography.xl, fontWeight: fontWeight.black, letterSpacing: -0.5 },
  myCardLabel: { color: colors.muted, fontSize: typography.xs },
  myCardXp: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
  levelPill: { backgroundColor: colors.primary + '18', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { color: colors.primary, fontSize: typography.xs, fontWeight: fontWeight.bold },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  podiumSlot: { alignItems: 'center', flex: 1, gap: 4 },
  podiumRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  podiumRankNum: { fontSize: 13, fontWeight: fontWeight.black },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.border },
  podiumAvatarFirst: { width: 60, height: 60, borderRadius: 30, borderColor: colors.yellow },
  podiumName: { color: colors.foreground, fontSize: typography.xs, fontWeight: fontWeight.semibold, textAlign: 'center' },
  podiumXp: { color: colors.muted, fontSize: 10 },
  podiumBase: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowMe: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' },
  rankBox: { width: 32, alignItems: 'center' },
  rankNum: { color: colors.muted, fontSize: typography.sm, fontWeight: fontWeight.bold },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rowName: { color: colors.foreground, fontSize: typography.sm, fontWeight: fontWeight.semibold },
  rowSub: { color: colors.muted, fontSize: typography.xs, marginTop: 1 },
  rowXp: { color: colors.primary, fontSize: typography.sm, fontWeight: fontWeight.bold },
  errTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: fontWeight.semibold, marginBottom: spacing.xs },
  errSub: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: 11 },
  retryText: { color: '#fff', fontWeight: fontWeight.bold },
});
