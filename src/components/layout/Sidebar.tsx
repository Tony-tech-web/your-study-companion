import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Bot, 
  MessageCircle, 
  Newspaper, 
  LogOut,
  GraduationCap,
  LayoutDashboard,
  Calculator,
  Calendar,
  BookOpen,
  Search,
  History,
  Sun,
  Moon,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', description: 'Overview and quick actions', path: '/dashboard' },
  { icon: Bot, label: 'AI Study Chat', description: 'Your intelligent study companion', path: '/dashboard/ai-assistant' },
  { icon: Calculator, label: 'GPA Calculator', description: 'Calculate and track your GPA', path: '/dashboard/gpa' },
  { icon: Calendar, label: 'Study Planner', description: 'AI-powered personalized study...', path: '/dashboard/planner' },
  { icon: BookOpen, label: 'Course Assistant', description: 'Upload materials & generate s...', path: '/dashboard/courses' },
  { icon: Search, label: 'Research Assistant', description: 'AI-powered academic research', path: '/dashboard/research' },
  { icon: History, label: 'History', description: 'View your past interactions', path: '/dashboard/history' },
];

const bottomNavItems = [
  { icon: User, label: 'Profile', path: '/dashboard/profile' },
  { icon: MessageCircle, label: 'Student Chat', path: '/dashboard/chat' },
  { icon: Newspaper, label: 'School News', path: '/dashboard/news' },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const userInitial = userName.charAt(0).toUpperCase();

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: '-100%',
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 30,
      },
    },
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        className="fixed left-0 top-0 h-screen w-72 bg-sidebar z-50 shadow-xl overflow-hidden flex flex-col"
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center shadow-lg">
              <GraduationCap className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-sidebar-foreground">
                Elizade AI
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Study Partner</p>
            </div>
          </Link>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-sidebar-accent border-l-3 border-sidebar-primary' 
                    : 'hover:bg-sidebar-accent/50'
                }`}
                onClick={() => window.innerWidth < 1024 && onToggle()}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive ? 'bg-sidebar-primary/20' : 'bg-sidebar-accent/30 group-hover:bg-sidebar-primary/10'
                }`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`block text-sm font-medium truncate ${isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/80'}`}>
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-sidebar-foreground/50 truncate">
                      {item.description}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/50"
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/30 flex items-center justify-center">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-sidebar-foreground/70" />
              ) : (
                <Moon className="h-4 w-4 text-sidebar-foreground/70" />
              )}
            </div>
            <span className="text-sm font-medium text-sidebar-foreground/80">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>

          {/* API Status */}
          <Link
            to="/dashboard/api-status"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent/50"
          >
            <div className="w-8 h-8 rounded-lg bg-sidebar-accent/30 flex items-center justify-center">
              <Zap className="h-4 w-4 text-sidebar-foreground/70" />
            </div>
            <span className="text-sm font-medium text-sidebar-foreground/80">
              API Status
            </span>
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-sidebar-accent/20 mt-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center text-sm font-bold text-sidebar-primary-foreground">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-sidebar-foreground truncate">
                {userName}
              </span>
              <button
                onClick={handleSignOut}
                className="text-xs text-sidebar-foreground/50 hover:text-destructive transition-colors flex items-center gap-1"
              >
                <LogOut className="h-3 w-3" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}