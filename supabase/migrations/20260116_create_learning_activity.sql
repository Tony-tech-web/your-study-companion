-- Create learning_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.learning_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_activity_user_id ON public.learning_activity (user_id);

CREATE INDEX IF NOT EXISTS idx_learning_activity_created_at ON public.learning_activity (created_at);

-- Enable RLS
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own activity" ON public.learning_activity FOR
INSERT
WITH
    CHECK (auth.uid () = user_id);

CREATE POLICY "Users can view their own activity" ON public.learning_activity FOR
SELECT USING (auth.uid () = user_id);

-- Grant permissions
GRANT ALL ON public.learning_activity TO authenticated;

GRANT ALL ON public.learning_activity TO service_role;