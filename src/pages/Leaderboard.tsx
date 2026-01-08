import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Flame, Star, Zap, TrendingUp, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  studentId: string;
  avatarUrl?: string;
  xpPoints: number;
  level: number;
  title: string;
  currentStreak: number;
  longestStreak: number;
  totalInteractions: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('xp');

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab, user]);

  const fetchLeaderboard = async (type: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-leaderboard', {
        body: { type, limit: 20, userId: user?.id }
      });

      if (error) throw error;

      setLeaderboard(data.leaderboard || []);
      setUserRank(data.userRank);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-amber-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-500/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-orange-500/20 border-amber-600/50';
      default:
        return 'bg-card/50 border-border/50';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <Trophy className="h-8 w-8 text-accent" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">Compete with fellow students and climb the ranks</p>
      </div>

      {/* User's Current Rank */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {userRank.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{userRank.name}</p>
                    <p className="text-sm text-muted-foreground">{userRank.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="inline-flex items-center gap-1 text-sm text-accent">
                        <Star className="h-4 w-4" /> Level {userRank.level}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-amber-500">
                        <Zap className="h-4 w-4" /> {userRank.xpPoints} XP
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-orange-500">
                        <Flame className="h-4 w-4" /> {userRank.currentStreak} streak
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Your Rank</p>
                  <p className="text-4xl font-bold text-accent">#{userRank.rank}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="xp" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            XP Points
          </TabsTrigger>
          <TabsTrigger value="level" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Level
          </TabsTrigger>
          <TabsTrigger value="streak" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Streak
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                Top Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No students on the leaderboard yet.</p>
                  <p className="text-sm text-muted-foreground/70">Start studying to be the first!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-xl border ${getRankBg(entry.rank)} ${entry.userId === user?.id ? 'ring-2 ring-accent' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-foreground flex items-center justify-center text-lg font-bold text-primary-foreground">
                          {entry.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {entry.name}
                            {entry.userId === user?.id && (
                              <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">You</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{entry.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {activeTab === 'xp' && (
                          <p className="font-bold text-accent">{entry.xpPoints.toLocaleString()} XP</p>
                        )}
                        {activeTab === 'level' && (
                          <p className="font-bold text-accent">Level {entry.level}</p>
                        )}
                        {activeTab === 'streak' && (
                          <p className="font-bold text-orange-500">{entry.currentStreak} days</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {activeTab !== 'streak' && `${entry.currentStreak} day streak`}
                          {activeTab === 'streak' && `Best: ${entry.longestStreak} days`}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
