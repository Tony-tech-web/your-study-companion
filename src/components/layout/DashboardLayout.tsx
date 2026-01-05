import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Menu } from 'lucide-react';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !window.location.hash.includes('access_token')) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden relative">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <main 
        className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-72' : 'pl-0'
        }`}
      >
        {/* Top Header with Toggle */}
        <header 
          className={`fixed top-0 left-0 right-0 h-16 flex items-center px-4 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 transition-all duration-300 ${
            sidebarOpen ? 'lg:pl-72' : 'pl-4'
          }`}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
            aria-label="Toggle Sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4 font-display font-semibold text-lg lg:hidden">
            Elizade AI
          </div>
        </header>

        <div className="p-4 lg:p-8 pt-20 lg:pt-20 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
