-- ============================================
-- Add Learning Activity Tracking & User Levels
-- ============================================

-- User stats and levels table
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_study_minutes INTEGER NOT NULL DEFAULT 0,
  total_ai_interactions INTEGER NOT NULL DEFAULT 0,
  total_pdfs_processed INTEGER NOT NULL DEFAULT 0,
  total_quizzes_completed INTEGER NOT NULL DEFAULT 0,
  total_flashcards_reviewed INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  xp_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Learning activity log for graphs
CREATE TABLE public.learning_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('ai_chat', 'pdf_upload', 'quiz', 'flashcard', 'research', 'study_plan', 'gpa_calc')),
  activity_count INTEGER NOT NULL DEFAULT 1,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- GPA Results Storage
-- ============================================

CREATE TABLE public.gpa_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  semester TEXT,
  courses JSONB NOT NULL,
  gpa NUMERIC(3,2) NOT NULL,
  total_credits INTEGER NOT NULL,
  gpa_class TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Study Planner Storage
-- ============================================

CREATE TABLE public.study_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subjects JSONB NOT NULL,
  total_hours INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Course Materials & Study Tools
-- ============================================

CREATE TABLE public.course_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pdf_id UUID REFERENCES public.student_pdfs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  parsed_content TEXT,
  study_tools JSONB,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Research History
-- ============================================

CREATE TABLE public.research_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  results JSONB,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- Enable RLS on all new tables
-- ============================================

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies - User Stats
-- ============================================

CREATE POLICY "Users can view their own stats" 
ON public.user_stats FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Learning Activity
-- ============================================

CREATE POLICY "Users can view their own activity" 
ON public.learning_activity FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" 
ON public.learning_activity FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS Policies - GPA Records
-- ============================================

CREATE POLICY "Users can view their own GPA records" 
ON public.gpa_records FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GPA records" 
ON public.gpa_records FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GPA records" 
ON public.gpa_records FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GPA records" 
ON public.gpa_records FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Study Plans
-- ============================================

CREATE POLICY "Users can view their own study plans" 
ON public.study_plans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans" 
ON public.study_plans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans" 
ON public.study_plans FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans" 
ON public.study_plans FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Course Materials
-- ============================================

CREATE POLICY "Users can view their own course materials" 
ON public.course_materials FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own course materials" 
ON public.course_materials FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own course materials" 
ON public.course_materials FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own course materials" 
ON public.course_materials FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- RLS Policies - Research History
-- ============================================

CREATE POLICY "Users can view their own research history" 
ON public.research_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own research history" 
ON public.research_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own research history" 
ON public.research_history FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at
BEFORE UPDATE ON public.study_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_materials_updated_at
BEFORE UPDATE ON public.course_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Security Fix: Add length constraint to chat_messages
-- ============================================

ALTER TABLE public.chat_messages 
ADD CONSTRAINT content_length_check 
CHECK (length(content) <= 10000);

-- ============================================
-- Create indexes for better performance
-- ============================================

CREATE INDEX idx_learning_activity_user_date ON public.learning_activity(user_id, activity_date);
CREATE INDEX idx_gpa_records_user ON public.gpa_records(user_id);
CREATE INDEX idx_study_plans_user ON public.study_plans(user_id);
CREATE INDEX idx_course_materials_user ON public.course_materials(user_id);
CREATE INDEX idx_research_history_user ON public.research_history(user_id);