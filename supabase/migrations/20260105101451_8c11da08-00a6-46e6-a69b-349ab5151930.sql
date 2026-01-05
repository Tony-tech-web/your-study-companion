-- Add student_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE;

-- Create function to generate unique student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'ELZ-AI-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE student_id = new_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;
  RETURN new_id;
END;
$$;

-- Create email domain validation function
CREATE OR REPLACE FUNCTION public.validate_email_domain(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow elizade.edu.ng domain (can be expanded later)
  RETURN email LIKE '%@elizade.edu.ng' OR email LIKE '%@student.elizade.edu.ng';
END;
$$;

-- Update handle_new_user function to generate student_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, email_username, full_name, matric_number, phone_number, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'matric_number',
    NEW.raw_user_meta_data ->> 'phone_number',
    public.generate_student_id()
  );
  RETURN NEW;
END;
$$;

-- Update existing profiles without student_id
UPDATE public.profiles SET student_id = public.generate_student_id() WHERE student_id IS NULL;

-- Make student_id NOT NULL after populating
ALTER TABLE public.profiles ALTER COLUMN student_id SET NOT NULL;

-- Add receiver_id for direct messaging support
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id);

-- Drop existing chat policies and recreate for DM support
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON public.chat_messages;

-- Create policies for direct messaging
CREATE POLICY "Users can view their own messages" 
ON public.chat_messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR receiver_id IS NULL);

CREATE POLICY "Users can send messages" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.chat_messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Enable realtime for chat_messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add table to realtime publication (only if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END $$;

-- Create index for faster chat queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at DESC);