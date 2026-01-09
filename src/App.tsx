import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AIAssistant from "./pages/AIAssistant";
import StudentChat from "./pages/StudentChat";
import SchoolNews from "./pages/SchoolNews";
import GPACalculator from "./pages/GPACalculator";
import StudyPlanner from "./pages/StudyPlanner";
import CourseAssistant from "./pages/CourseAssistant";
import ResearchAssistant from "./pages/ResearchAssistant";
import History from "./pages/History";
import Leaderboard from "./pages/Leaderboard";
import Tips from "./pages/Tips";
import NotFound from "./pages/NotFound";

// Note: APIStatus is now a modal component, not a page

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="ai-assistant" element={<AIAssistant />} />
              <Route path="chat" element={<StudentChat />} />
              <Route path="news" element={<SchoolNews />} />
              <Route path="gpa" element={<GPACalculator />} />
              <Route path="planner" element={<StudyPlanner />} />
              <Route path="courses" element={<CourseAssistant />} />
              <Route path="research" element={<ResearchAssistant />} />
              <Route path="history" element={<History />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="tips" element={<Tips />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
