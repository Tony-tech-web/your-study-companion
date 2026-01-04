import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bot, MessageCircle, Newspaper, User, ArrowRight, BookOpen, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const quickActions = [
  {
    icon: Bot,
    title: 'AI Study Assistant',
    description: 'Get help with your studies using AI',
    path: '/dashboard/ai-assistant',
    color: 'bg-accent',
  },
  {
    icon: User,
    title: 'Personal Details',
    description: 'View and manage your profile & PDFs',
    path: '/dashboard/profile',
    color: 'bg-primary',
  },
  {
    icon: MessageCircle,
    title: 'Student Chat',
    description: 'Connect with fellow students',
    path: '/dashboard/chat',
    color: 'bg-success',
  },
  {
    icon: Newspaper,
    title: 'School News',
    description: 'Stay updated with announcements',
    path: '/dashboard/news',
    color: 'bg-secondary',
  },
];

const stats = [
  { icon: BookOpen, label: 'PDFs Uploaded', value: '0' },
  { icon: TrendingUp, label: 'AI Conversations', value: '0' },
  { icon: Clock, label: 'Study Hours', value: '0' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-navy-gradient rounded-2xl p-8 text-cream relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-cream/70 text-lg max-w-xl">
            Ready to supercharge your studies? Your AI-powered study partner is here to help you excel.
          </p>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="card-hover">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-2xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <Link to={action.path}>
                  <Card className="card-hover group cursor-pointer">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className={`w-14 h-14 rounded-xl ${action.color} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-accent transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              💡 Pro Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Upload your course PDFs to get AI-powered explanations and summaries</li>
              <li>• Use the AI Assistant to help break down complex topics</li>
              <li>• Connect with classmates in the Student Chat for study groups</li>
              <li>• Check School News regularly for important announcements</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
