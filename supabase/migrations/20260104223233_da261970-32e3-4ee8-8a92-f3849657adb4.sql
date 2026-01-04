-- Create profiles table for student data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_username TEXT NOT NULL,
  matric_number TEXT UNIQUE,
  phone_number TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create student_pdfs table for PDF storage references
CREATE TABLE public.student_pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_pdfs ENABLE ROW LEVEL SECURITY;

-- PDF policies - only owner can access
CREATE POLICY "Users can view their own PDFs" 
ON public.student_pdfs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own PDFs" 
ON public.student_pdfs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own PDFs" 
ON public.student_pdfs FOR DELETE 
USING (auth.uid() = user_id);

-- Create chat_messages table for student-to-student messaging
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat policies - all authenticated users can read and send
CREATE POLICY "Authenticated users can view all messages" 
ON public.chat_messages FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can send messages" 
ON public.chat_messages FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Create ai_conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- AI conversation policies
CREATE POLICY "Users can view their own AI conversations" 
ON public.ai_conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI conversations" 
ON public.ai_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI conversations" 
ON public.ai_conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Create school_news table
CREATE TABLE public.school_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - news is public to authenticated users
ALTER TABLE public.school_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view news" 
ON public.school_news FOR SELECT 
TO authenticated
USING (true);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('student-pdfs', 'student-pdfs', false);

-- Storage policies for PDFs
CREATE POLICY "Users can upload their own PDFs" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'student-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own PDFs" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'student-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own PDFs" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'student-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, email_username, full_name, matric_number, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'matric_number',
    NEW.raw_user_meta_data ->> 'phone_number'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();