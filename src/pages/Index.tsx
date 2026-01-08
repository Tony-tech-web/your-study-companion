import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, BookOpen, GraduationCap, Sparkles, ChevronRight, 
  Brain, BarChart3, Users, Zap, Trophy, Clock, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Bot,
    title: 'AI Study Assistant',
    description: 'Get instant help with any subject using advanced AI tutoring',
  },
  {
    icon: BookOpen,
    title: 'Smart Course Materials',
    description: 'Upload PDFs and generate flashcards, quizzes, and summaries automatically',
  },
  {
    icon: Brain,
    title: 'Personalized Learning',
    description: 'AI adapts to your learning style and CGPA for tailored assistance',
  },
  {
    icon: BarChart3,
    title: 'Progress Tracking',
    description: 'Monitor your study streaks, XP points, and level progression',
  },
  {
    icon: Users,
    title: 'Student Community',
    description: 'Connect with fellow students and climb the leaderboard',
  },
  {
    icon: Zap,
    title: 'Research Assistant',
    description: 'AI-powered academic research with unique project ideas',
  },
];

const stats = [
  { value: '10K+', label: 'Active Students' },
  { value: '50K+', label: 'Study Sessions' },
  { value: '95%', label: 'Satisfaction Rate' },
  { value: '24/7', label: 'AI Availability' },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">Elizade AI</span>
            </div>
            <div className="flex items-center gap-4">
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
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent/20 rounded-full text-accent text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Learning Platform
            </motion.div>

            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Your Personal
              <span className="text-gradient-gold block">AI Study Companion</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Transform your academic journey with intelligent tutoring, smart study tools, 
              and personalized learning paths designed for Elizade University students.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="btn-gold btn-smooth text-lg px-8 py-6">
                  Start Learning Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="btn-smooth text-lg px-8 py-6">
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Hero Image / Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 relative"
          >
            <div className="glass-card rounded-3xl p-2 shadow-2xl max-w-5xl mx-auto">
              <div className="bg-navy-gradient rounded-2xl p-8 aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                {/* Mock Dashboard */}
                <div className="absolute inset-0 p-6 grid grid-cols-3 gap-4">
                  <div className="col-span-2 glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                        <Bot className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-white/10 rounded mt-1" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-white/10 rounded" />
                      <div className="h-3 w-4/5 bg-white/10 rounded" />
                      <div className="h-3 w-3/5 bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        <span className="text-white/80 text-sm">Level 5</span>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full">
                        <div className="h-full w-3/4 bg-accent rounded-full" />
                      </div>
                    </div>
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-blue-400" />
                        <span className="text-white/80 text-sm">Study Streak</span>
                      </div>
                      <div className="text-2xl font-bold text-white">7 Days</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-display font-bold text-gradient-gold mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
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
                  className="glass-card rounded-2xl p-6 hover-lift cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
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
            className="glass-card rounded-3xl p-12 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <GraduationCap className="h-16 w-16 text-accent mx-auto mb-6" />
              <h2 className="font-display text-4xl font-bold mb-4">
                Ready to Transform Your Studies?
              </h2>
              <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of Elizade students already using AI to achieve academic excellence.
              </p>
              <Link to="/auth">
                <Button size="lg" className="btn-gold btn-smooth text-lg px-10 py-6">
                  Get Started Now
                  <Sparkles className="h-5 w-5 ml-2" />
                </Button>
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary-foreground" />
              </div>
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
