import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Bot,
  BookOpen,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Brain,
  BarChart3,
  Users,
  Zap,
  Trophy,
  Clock,
  ArrowRight,
  Sun,
  Moon,
  FileText,
  MessageSquare,
  Target,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const features = [
  {
    icon: Bot,
    title: 'AI Study Assistant',
    description: 'Get instant help with any subject using advanced AI tutoring',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BookOpen,
    title: 'Smart Course Materials',
    description: 'Upload PDFs and generate flashcards, quizzes, and summaries automatically',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Brain,
    title: 'Personalized Learning',
    description: 'AI adapts to your learning style and CGPA for tailored assistance',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Monitor your study streaks, XP points, and level progression',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Users,
    title: 'Student Community',
    description: 'Connect with fellow students and climb the leaderboard',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Zap,
    title: 'Research Assistant',
    description: 'AI-powered academic research with unique project ideas',
    color: 'from-amber-500 to-yellow-500',
  },
];

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.floor(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 2,
      ease: 'easeOut',
    });
    
    const unsubscribe = rounded.on('change', (v) => setDisplayValue(v));
    
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  return (
    <span>
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// Floating particle component
function FloatingParticle({ delay, duration, x, y, size }: { delay: number; duration: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-accent/30"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export default function Index() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAIChats: 0,
    totalPdfs: 0,
    totalStudyMinutes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch real stats from the database
        const [profilesRes, conversationsRes, pdfsRes, statsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('ai_conversations').select('id', { count: 'exact', head: true }),
          supabase.from('student_pdfs').select('id', { count: 'exact', head: true }),
          supabase.from('user_stats').select('total_study_minutes'),
        ]);

        const totalStudyMins = statsRes.data?.reduce((acc, s) => acc + (s.total_study_minutes || 0), 0) || 0;

        setStats({
          totalUsers: profilesRes.count || 0,
          totalAIChats: conversationsRes.count || 0,
          totalPdfs: pdfsRes.count || 0,
          totalStudyMinutes: totalStudyMins,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const displayStats = [
    { 
      value: Math.max(stats.totalUsers, 1), 
      label: 'Active Students',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    { 
      value: stats.totalAIChats, 
      label: 'AI Conversations',
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-500',
    },
    { 
      value: stats.totalPdfs, 
      label: 'Documents Processed',
      icon: FileText,
      color: 'from-green-500 to-emerald-500',
    },
    { 
      value: stats.totalStudyMinutes, 
      suffix: ' min',
      label: 'Study Time',
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </motion.div>
              <span className="font-display text-xl font-bold">Elizade AI</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                className="btn-smooth"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                <motion.div
                  key={isDark ? 'dark' : 'light'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </motion.div>
              </Button>
              <Link to="/auth">
                <Button variant="ghost" className="btn-smooth">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="btn-gold btn-smooth">
                  Get Started
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-accent/30 to-amber-500/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-primary/30 to-purple-500/20 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-accent/10 to-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          
          {/* Floating Particles */}
          <FloatingParticle delay={0} duration={4} x="10%" y="20%" size={8} />
          <FloatingParticle delay={1} duration={5} x="80%" y="30%" size={6} />
          <FloatingParticle delay={2} duration={6} x="20%" y="70%" size={10} />
          <FloatingParticle delay={0.5} duration={4.5} x="70%" y="60%" size={7} />
          <FloatingParticle delay={1.5} duration={5.5} x="40%" y="80%" size={5} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent/20 to-amber-500/20 rounded-full text-accent text-sm font-medium mb-6 border border-accent/30"
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              AI-Powered Learning Platform
              <Sparkles className="h-4 w-4 animate-pulse" />
            </motion.div>

            <motion.h1 
              className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Your Personal
              <motion.span 
                className="text-gradient-gold block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                AI Study Companion
              </motion.span>
            </motion.h1>

            <motion.p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Transform your academic journey with intelligent tutoring, smart study tools, 
              and personalized learning paths designed for Elizade University students.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="btn-gold btn-smooth text-lg px-8 py-6 shadow-lg shadow-accent/25">
                    Start Learning Free
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="btn-smooth text-lg px-8 py-6">
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Hero Image / Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-16 relative"
          >
            <div className="glass-card rounded-3xl p-2 shadow-2xl max-w-5xl mx-auto border border-border/50">
              <div className="bg-gradient-to-br from-primary/90 via-primary to-indigo-900 rounded-2xl p-8 aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                  }} />
                </div>
                
                {/* Mock Dashboard */}
                <div className="absolute inset-0 p-6 grid grid-cols-3 gap-4">
                  {/* Main Chat Area */}
                  <motion.div 
                    className="col-span-2 glass rounded-xl p-4 border border-white/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div 
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Bot className="h-6 w-6 text-primary-foreground" />
                      </motion.div>
                      <div>
                        <div className="text-white font-medium">AI Assistant</div>
                        <div className="text-white/60 text-sm flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          Online
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <motion.div 
                        className="bg-white/10 rounded-lg p-3 text-white/80 text-sm max-w-[80%]"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2 }}
                      >
                        How can I help you with your studies today?
                      </motion.div>
                      <motion.div 
                        className="bg-accent/20 rounded-lg p-3 text-white/80 text-sm max-w-[80%] ml-auto"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.4 }}
                      >
                        Can you explain quantum mechanics?
                      </motion.div>
                      <motion.div 
                        className="flex gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.6 }}
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 bg-white/40 rounded-full"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </motion.div>
                    </div>
                  </motion.div>
                  
                  {/* Side Stats */}
                  <div className="space-y-4">
                    <motion.div 
                      className="glass rounded-xl p-4 border border-white/10"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        <span className="text-white/80 text-sm">Level 5</span>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-accent to-amber-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: '75%' }}
                          transition={{ delay: 1.3, duration: 1 }}
                        />
                      </div>
                      <div className="text-white/60 text-xs mt-1">750 / 1000 XP</div>
                    </motion.div>
                    
                    <motion.div 
                      className="glass rounded-xl p-4 border border-white/10"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Flame className="h-5 w-5 text-orange-400" />
                        <span className="text-white/80 text-sm">Study Streak</span>
                      </div>
                      <div className="text-2xl font-bold text-white">7 Days 🔥</div>
                    </motion.div>
                    
                    <motion.div 
                      className="glass rounded-xl p-4 border border-white/10"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.3 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-green-400" />
                        <span className="text-white/80 text-sm">Today's Goal</span>
                      </div>
                      <div className="text-lg font-semibold text-white">3/5 Tasks</div>
                      <div className="h-1.5 w-full bg-white/20 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          className="h-full bg-green-400 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: '60%' }}
                          transition={{ delay: 1.5, duration: 1 }}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating badges */}
            <motion.div
              className="absolute -left-4 top-1/4 glass-card rounded-xl px-4 py-2 shadow-lg border border-border/50"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Smart Learning</div>
                  <div className="text-sm font-semibold">AI Powered</div>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="absolute -right-4 bottom-1/4 glass-card rounded-xl px-4 py-2 shadow-lg border border-border/50"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Performance</div>
                  <div className="text-sm font-semibold">+40% Grades</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Real Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-y border-border/50 bg-gradient-to-b from-muted/50 to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '32px 32px',
            color: 'hsl(var(--accent) / 0.3)'
          }} />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Trusted by <span className="text-gradient-gold">Elizade Students</span>
            </h2>
            <p className="text-muted-foreground">Real-time platform statistics</p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {displayStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="glass-card rounded-2xl p-6 text-center relative overflow-hidden group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-4xl md:text-5xl font-display font-bold text-gradient-gold mb-2">
                    {loading ? (
                      <span className="animate-pulse">--</span>
                    ) : (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    )}
                  </div>
                  <div className="text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4"
            >
              <Sparkles className="h-4 w-4" />
              Features
            </motion.div>
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-gradient-gold">Excel</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful AI tools designed specifically for academic success
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="glass-card rounded-2xl p-6 hover-lift cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <motion.div 
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </motion.div>
                  <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                  <motion.div
                    className="mt-4 flex items-center text-accent font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                  >
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 text-center relative overflow-hidden border border-border/50"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/30 to-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-primary/30 to-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <GraduationCap className="h-16 w-16 text-accent mx-auto mb-6" />
              </motion.div>
              <h2 className="font-display text-4xl font-bold mb-4">
                Ready to Transform Your Studies?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of Elizade students already using AI to achieve academic excellence.
              </p>
              <Link to="/auth">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="btn-gold btn-smooth text-lg px-10 py-6 shadow-lg shadow-accent/25">
                    Get Started Now
                    <Sparkles className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div 
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </motion.div>
              <span className="font-display font-bold">Elizade AI</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Elizade University. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
