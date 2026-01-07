import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Bot, MessageCircle, User, ArrowRight, BookOpen, TrendingUp, 
  Clock, Calculator, Calendar, Search, Lightbulb, Flame,
  Sparkles, GraduationCap, CheckCircle2, Trophy, Star, Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const quickActions = [
  { icon: Bot, title: 'Start AI Chat', description: 'Get instant help', path: '/dashboard/ai-assistant', color: 'from-blue-500 to-blue-600' },
  { icon: Calendar, title: 'Study Planner', description: 'Plan your studies', path: '/dashboard/planner', color: 'from-purple-500 to-purple-600' },
  { icon: Calculator, title: 'GPA Calculator', description: 'Track your grades', path: '/dashboard/gpa', color: 'from-green-500 to-green-600' },
  { icon: BookOpen, title: 'Course Assistant', description: 'Upload materials', path: '/dashboard/courses', color: 'from-orange-500 to-orange-600' },
  { icon: Search, title: 'Research Helper', description: 'Find resources', path: '/dashboard/research', color: 'from-pink-500 to-pink-600' },
  { icon: Lightbulb, title: 'Study Tips', description: 'Improve efficiency', path: '/dashboard/ai-assistant', color: 'from-amber-500 to-amber-600' },
];

const levelTitles = ['Beginner Scholar', 'Active Learner', 'Knowledge Seeker', 'Study Master', 'Academic Pro', 'Genius'];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function calculateLevel(xp: number) {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 600) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  return 6;
}

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  
  const [userStats, setUserStats] = useState({
    totalStudyMinutes: 0,
    totalAiInteractions: 0,
    totalPdfsProcessed: 0,
    currentStreak: 0,
    longestStreak: 0,
    xpPoints: 0,
    level: 1,
  });
  
  const [activityData, setActivityData] = useState<{ name: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch or create user stats
        let { data: stats, error: statsError } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsError && statsError.code === 'PGRST116') {
          // Create initial stats
          const { data: newStats } = await supabase
            .from('user_stats')
            .insert({ user_id: user.id })
            .select()
            .single();
          stats = newStats;
        }

        if (stats) {
          // Check and update streak
          const today = new Date().toISOString().split('T')[0];
          const lastActivity = stats.last_activity_date;
          let currentStreak = stats.current_streak || 0;
          
          if (lastActivity) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastActivity === today) {
              // Already logged today
            } else if (lastActivity === yesterdayStr) {
              // Streak continues, will be updated on activity
            } else {
              // Streak broken
              currentStreak = 0;
            }
          }

          setUserStats({
            totalStudyMinutes: stats.total_study_minutes || 0,
            totalAiInteractions: stats.total_ai_interactions || 0,
            totalPdfsProcessed: stats.total_pdfs_processed || 0,
            currentStreak: currentStreak,
            longestStreak: stats.longest_streak || 0,
            xpPoints: stats.xp_points || 0,
            level: calculateLevel(stats.xp_points || 0),
          });
        }

        // Fetch learning activity for chart (last 7 days aggregated by type)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: activity } = await supabase
          .from('learning_activity')
          .select('activity_type, activity_count')
          .eq('user_id', user.id)
          .gte('activity_date', sevenDaysAgo.toISOString().split('T')[0]);

        if (activity && activity.length > 0) {
          const aggregated: Record<string, number> = {};
          activity.forEach(a => {
            const label = a.activity_type === 'ai_chat' ? 'AI Chat' 
              : a.activity_type === 'pdf_upload' ? 'PDFs'
              : a.activity_type === 'quiz' ? 'Quizzes'
              : a.activity_type === 'flashcard' ? 'Flashcards'
              : a.activity_type === 'research' ? 'Research'
              : a.activity_type;
            aggregated[label] = (aggregated[label] || 0) + (a.activity_count || 1);
          });
          
          setActivityData(Object.entries(aggregated).map(([name, count]) => ({ name, count })));
        } else {
          // Fallback: Count from ai_conversations
          const { count: aiCount } = await supabase
            .from('ai_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          const { count: pdfCount } = await supabase
            .from('student_pdfs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if ((aiCount || 0) > 0 || (pdfCount || 0) > 0) {
            setActivityData([
              { name: 'AI Chat', count: aiCount || 0 },
              { name: 'PDFs', count: pdfCount || 0 },
            ]);
          }
        }

        // Fetch recent activity
        const { data: recent } = await supabase
          .from('ai_conversations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
          
        setRecentActivity(recent || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const xpForNextLevel = userStats.level * 100 + 100;
  const xpProgress = (userStats.xpPoints % xpForNextLevel) / xpForNextLevel * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-2xl font-bold text-primary-foreground shadow-lg relative">
              {userName.charAt(0).toUpperCase()}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
                {getGreeting()}, {userName}! <Sparkles className="h-6 w-6 text-accent" />
              </h1>
              <p className="text-muted-foreground">Ready to continue your learning journey?</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent text-xs font-medium rounded-full">
                  <GraduationCap className="h-3 w-3" />
                  {levelTitles[Math.min(userStats.level - 1, levelTitles.length - 1)]}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary dark:text-primary-foreground text-xs font-medium rounded-full">
                  <Star className="h-3 w-3" /> Level {userStats.level}
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full">
                  <Zap className="h-3 w-3" /> {userStats.xpPoints} XP
                </span>
              </div>
              {/* XP Progress Bar */}
              <div className="mt-2 w-48">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-amber-500 transition-all duration-500"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {userStats.xpPoints % xpForNextLevel}/{xpForNextLevel} XP to Level {userStats.level + 1}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Study Streak</p>
            <div className="flex items-center gap-1 justify-end">
              <Flame className="h-6 w-6 text-orange-500" />
              <span className="text-3xl font-bold text-accent">{userStats.currentStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">days</p>
            {userStats.longestStreak > 0 && (
              <p className="text-[10px] text-muted-foreground/70 flex items-center justify-end gap-1 mt-1">
                <Trophy className="h-3 w-3" /> Best: {userStats.longestStreak} days
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hours Studied', value: Math.floor(userStats.totalStudyMinutes / 60), icon: Clock, color: 'text-blue-500' },
          { label: 'AI Interactions', value: userStats.totalAiInteractions, icon: Bot, color: 'text-purple-500' },
          { label: 'PDFs Processed', value: userStats.totalPdfsProcessed, icon: BookOpen, color: 'text-green-500' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card hover-lift">
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions & Learning Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Quick Actions
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link to={action.path}>
                        <div className="glass-card hover-lift p-4 rounded-xl cursor-pointer group text-center">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-sm group-hover:text-accent transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Activity Chart */}
        <div>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
                Learning Activity
              </h2>
              
              {activityData.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="hsl(var(--accent))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No activity data yet.</p>
                  <p className="text-sm text-muted-foreground/70">
                    Start using the learning tools!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pro Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-accent/30 bg-gradient-to-r from-accent/10 to-transparent">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-accent mb-1">Pro Tip</h3>
              <p className="text-sm text-muted-foreground">
                Upload your course materials in the Course Assistant to generate flashcards, quizzes, and summaries automatically!
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              Recent Activity
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Latest 5
              </span>
            </h2>
            <Link to="/dashboard/history" className="text-sm text-muted-foreground hover:text-accent transition-colors flex items-center gap-1">
              View History <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">No recent activity found.</p>
              <p className="text-sm text-muted-foreground/70">
                Your recent interactions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity, i) => {
                const isUser = activity.role === 'user';
                const cleanContent = activity.content.replace(/^{{model:[^}]+}}/, '');
                
                return (
                  <Link key={activity.id} to="/dashboard/history">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
                        isUser 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-accent/10 border-accent/20 text-accent'
                      }`}>
                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium leading-none">
                            {isUser ? 'You' : 'AI Assistant'}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 group-hover:text-foreground transition-colors">
                          {cleanContent}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
