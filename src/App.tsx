import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const StudentChat = lazy(() => import("./pages/StudentChat"));
const SchoolNews = lazy(() => import("./pages/SchoolNews"));
const GPACalculator = lazy(() => import("./pages/GPACalculator"));
const StudyPlanner = lazy(() => import("./pages/StudyPlanner"));
const CourseAssistant = lazy(() => import("./pages/CourseAssistant"));
const ResearchAssistant = lazy(() => import("./pages/ResearchAssistant"));
const History = lazy(() => import("./pages/History"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Tips = lazy(() => import("./pages/Tips"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoading = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-accent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Suspense fallback={<RouteLoading />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

