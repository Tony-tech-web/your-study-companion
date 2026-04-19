# Database Setup Instructions

Since the automatic migration encountered an issue, please apply the database changes manually:

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/phxvizvqkueddelnseam/editor
2. Click on "SQL Editor"
3. Create a new query and paste the following SQL:

```sql
-- Create learning_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.learning_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_activity_user_id ON public.learning_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_activity_created_at ON public.learning_activity(created_at);

-- Enable RLS
ALTER TABLE public.learning_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.learning_activity;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.learning_activity;

-- Create RLS policies
CREATE POLICY "Users can insert their own activity"
  ON public.learning_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own activity"
  ON public.learning_activity
  FOR SELECT
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.learning_activity TO authenticated;
GRANT ALL ON public.learning_activity TO service_role;
```

4. Click "Run" to execute the SQL

## Option 2: Skip Database Setup

The application will work without the `learning_activity` table - it will just skip activity logging. The error handling has been updated to fail silently.

## Testing After Setup

1. Refresh your application
2. Try uploading a PDF and chatting with the AI
3. Check the browser console - you should no longer see 400 or 502 errors
