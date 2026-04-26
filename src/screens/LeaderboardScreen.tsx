import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography, fontWeight, shadow } from '../lib/theme';
import { getLeaderboard, LeaderboardResult } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [result, setResult] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setResult(await getLeaderboard());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  if (error || !result) return (
    <View style={s.center}>
      <Text style={s.errorIcon}>🏆</Text>
      <Text style={s.errorTitle}>Leaderboard unavailable</Text>
      <Text style={s.errorText}>{error || 'No data'}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
        <Text style={s.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const { entries, myRank } = result;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <Text style={s.title}>Leaderboard</Text>

      {/* My rank card */}
      {myRank && (
        <View style={s.myRankCard}>
          <Text style={s.myRankLabel}>Your Rank</Text>
          <View style={s.myRankRow}>
            <Text style={s.myRankNum}>#{myRank.rank}</Text>
            <View>
              <Text style={s.myRankXp}>{myRank.xp} XP</Text>
              <Text style={s.myRankTitle}>{myRank.title}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <View style={s.podium}>
          {/* 2nd */}
          {top3[1] && (
            <View style={[s.podiumItem, s.podiumSecond]}>
              <Text style={s.podiumMedal}>{MEDAL[1]}</Text>
              <Image source={{ uri: top3[1].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[1].name}</Text>
              <Text style={s.podiumXp}>{top3[1].xp} XP</Text>
              <View style={[s.podiumBar, { height: 60 }]} />
            </View>
          )}
          {/* 1st */}
          {top3[0] && (
            <View style={[s.podiumItem, s.podiumFirst]}>
              <Text style={s.podiumMedal}>{MEDAL[0]}</Text>
              <Image source={{ uri: top3[0].avatar }} style={[s.podiumAvatar, s.podiumAvatarFirst]} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[0].name}</Text>
              <Text style={s.podiumXp}>{top3[0].xp} XP</Text>
              <View style={[s.podiumBar, { height: 90, backgroundColor: colors.primary }]} />
            </View>
          )}
          {/* 3rd */}
          {top3[2] && (
            <View style={[s.podiumItem, s.podiumThird]}>
              <Text style={s.podiumMedal}>{MEDAL[2]}</Text>
              <Image source={{ uri: top3[2].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[2].name}</Text>
              <Text style={s.podiumXp}>{top3[2].xp} XP</Text>
              <View style={[s.podiumBar, { height: 45 }]} />
            </View>
          )}
        </View>
      )}

      {/* Rest of leaderboard */}
      {rest.map((entry, i) => {
        const isMe = entry.user_id === user?.id;
        return (
          <View key={entry.id} style={[s.row, isMe && s.rowMe]}>
            <Text style={s.rowRank}>#{entry.rank}</Text>
            <Image source={{ uri: entry.avatar }} style={s.rowAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowName}>{entry.name}{isMe ? ' (You)' : ''}</Text>
              <Text style={s.rowTitle}>{entry.title || `Level ${entry.level}`}</Text>
            </View>
            <Text style={s.rowXp}>{entry.xp} XP</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { color: colors.foreground, fontSize: typography.title1, fontWeight: fontWeight.black },
  errorIcon: { fontSize: 48 },
  errorTitle: { color: colors.foreground, fontSize: typography.title3, fontWeight: fontWeight.bold },
  errorText: { color: colors.muted, fontSize: typography.subheadline, textAlign: 'center', paddingHorizontal: spacing.lg },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryBtnText: { color: '#fff', fontWeight: fontWeight.bold },
  myRankCard: { backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '50' },
  myRankLabel: { color: colors.muted, fontSize: typography.footnote, marginBottom: spacing.sm },
  myRankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  myRankNum: { color: colors.primary, fontSize: typography['3xl'], fontWeight: '900' },
  myRankXp: { color: colors.foreground, fontSize: typography.title3, fontWeight: fontWeight.bold },
  myRankTitle: { color: colors.muted, fontSize: typography.xs },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumFirst: {},
  podiumSecond: {},
  podiumThird: {},
  podiumMedal: { fontSize: 24, marginBottom: 4 },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.borderSolid, marginBottom: 4 },
  podiumAvatarFirst: { width: 60, height: 60, borderRadius: 30, borderColor: colors.primary },
  podiumName: { color: colors.foreground, fontSize: typography.footnote, fontWeight: fontWeight.bold, textAlign: 'center' },
  podiumXp: { color: colors.primary, fontSize: 10, fontWeight: fontWeight.semibold, marginBottom: 4 },
  podiumBar: { width: '100%', backgroundColor: colors.cardSolid, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.cardSolid, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowMe: { borderColor: colors.primary },
  rowRank: { color: colors.muted, fontSize: typography.subheadline, fontWeight: fontWeight.bold, width: 32 },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  rowName: { color: colors.foreground, fontSize: typography.subheadline, fontWeight: fontWeight.semibold },
  rowTitle: { color: colors.muted, fontSize: typography.footnote, marginTop: 1 },
  rowXp: { color: colors.primary, fontSize: typography.subheadline, fontWeight: fontWeight.bold },
});
