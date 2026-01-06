import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Bot, MessageCircle, User, ArrowRight, BookOpen, TrendingUp, 
  Clock, Calculator, Calendar, Search, Lightbulb, Flame,
  Sparkles, GraduationCap, CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const quickActions = [
  {
    icon: Bot,
    title: 'Start AI Chat',
    description: 'Get instant help',
    path: '/dashboard/ai-assistant',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Calendar,
    title: 'Study Planner',
    description: 'Plan your studies',
    path: '/dashboard/planner',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Calculator,
    title: 'GPA Calculator',
    description: 'Track your grades',
    path: '/dashboard/gpa',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: BookOpen,
    title: 'Course Assistant',
    description: 'Upload materials',
    path: '/dashboard/courses',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: Search,
    title: 'Research Helper',
    description: 'Find resources',
    path: '/dashboard/research',
    color: 'from-pink-500 to-pink-600',
  },
  {
    icon: Lightbulb,
    title: 'Study Tips',
    description: 'Improve efficiency',
    path: '/dashboard/ai-assistant',
    color: 'from-amber-500 to-amber-600',
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const [stats, setStats] = useState({
    hoursStudied: 0,
    tasksCompleted: 0,
    aiInteractions: 0,
  });
  const [studyStreak, setStudyStreak] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      // Fetch AI conversations count
      const { count: aiCount } = await supabase
        .from('ai_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      // Fetch PDFs count (as tasks)
      const { count: pdfCount } = await supabase
        .from('student_pdfs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch Recent Activity
      const { data: recent } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      setActivities(recent || []);

      setStats({
        hoursStudied: Math.floor((aiCount || 0) / 10),
        tasksCompleted: pdfCount || 0,
        aiInteractions: aiCount || 0,
      });
    };

    fetchStats();
  }, [user]);

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
                  Beginner Scholar
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary dark:text-primary-foreground text-xs font-medium rounded-full">
                  ⭐ Level 1
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Study Streak</p>
            <div className="flex items-center gap-1 justify-end">
              <Flame className="h-6 w-6 text-orange-500" />
              <span className="text-3xl font-bold text-accent">{studyStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Hours Studied', value: stats.hoursStudied, icon: Clock, color: 'text-blue-500' },
          { label: 'Tasks Completed', value: stats.tasksCompleted, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'AI Interactions', value: stats.aiInteractions, icon: Bot, color: 'text-purple-500' },
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
                <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                  ⚙️
                </button>
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

        {/* Learning Activity */}
        <div>
          <Card className="glass-card h-full">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-accent" />
                Learning Activity
              </h2>
              
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-medium">No activity data yet.</p>
                <p className="text-sm text-muted-foreground/70">
                  Start using the learning tools to see your activity here.
                </p>
              </div>
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
                Start with the AI Chat to get personalized study recommendations, then use the Study Planner to organize your schedule!
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
          
          {activities.length === 0 ? (
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
                {activities.map((activity, i) => {
                    const isUser = activity.role === 'user';
                    // Simple model stripper
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