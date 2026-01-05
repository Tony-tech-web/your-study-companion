import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { 
  User, 
  Bot, 
  MessageCircle, 
  Newspaper, 
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: User, label: 'Personal Details', path: '/dashboard/profile' },
  { icon: Bot, label: 'AI Study Assistant', path: '/dashboard/ai-assistant' },
  { icon: MessageCircle, label: 'Student Chat', path: '/dashboard/chat' },
  { icon: Newspaper, label: 'School News', path: '/dashboard/news' },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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
        className="fixed left-0 top-0 h-screen w-72 bg-sidebar z-50 shadow-xl overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => window.innerWidth < 1024 && onToggle()}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70'}`} />
                  <span className={`font-medium ${isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/70'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={handleSignOut}
              className="sidebar-item w-full text-sidebar-foreground/70 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
