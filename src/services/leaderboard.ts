import { callEdgeFunction } from '../lib/supabase';
import { LeaderboardEntry } from '../types';

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  myRank: { rank: number; xp: number; level: number; title: string; } | null;
}

export const getLeaderboard = async (): Promise<LeaderboardResult> => {
  const res = await callEdgeFunction('get-leaderboard', { type: 'xp', limit: 50 });

  if (!res.ok) {
    // Try to get meaningful error message
    const text = await res.text().catch(() => '');
    let message = `Leaderboard fetch failed (${res.status})`;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
    } catch { /* use status message */ }
    throw new Error(message);
  }

  const data = await res.json();

  const entries: LeaderboardEntry[] = (data.leaderboard || []).map((e: any) => ({
    id: e.rank?.toString() || Math.random().toString(),
    user_id: e.userId || '',
    rank: e.rank || 0,
    xp: e.xpPoints || 0,
    level: e.level || 1,
    name: e.displayName || 'Student',
    title: e.title || `Level ${e.level || 1}`,
    avatar: e.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.displayName || 'S')}&backgroundColor=f27d26&textColor=ffffff`,
    student_id: '',
    weeklyGain: 0,
  }));

  const myRank = data.userRank ? {
    rank: data.userRank.rank || 0,
    xp: data.userRank.xpPoints || 0,
    level: data.userRank.level || 1,
    title: data.userRank.title || 'Freshman Scholar',
  } : null;

  return { entries, myRank };
};
