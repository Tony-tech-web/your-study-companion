-- Security Hardening Migration

-- 1. Fix Critical Vulnerability in chat_messages
-- Previous policy allowed all authenticated users to view all messages.
-- New policy restricts view to only the sender and the receiver.

DROP POLICY IF EXISTS "Authenticated users can view all messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;

CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR
SELECT TO authenticated USING (
        auth.uid () = sender_id
        OR auth.uid () = receiver_id
    );

-- 2. Harden profiles table
-- Re-asserting the SELECT policy to ensure it is strictly for the owner.
-- (This replaces any potential previous policy with the same name, or acts as a safeguard)

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT TO authenticated USING (auth.uid () = user_id);

-- 3. Verify ai_conversations (already secure, but good to be explicit/redundant in a security patch)
-- Previous: USING (auth.uid() = user_id)
-- We leave it as is, assuming it was created correctly in the previous dump,
-- but we can explicitly set it to ensure no regression.

DROP POLICY IF EXISTS "Users can view their own AI conversations" ON public.ai_conversations;

CREATE POLICY "Users can view their own AI conversations" ON public.ai_conversations FOR
SELECT TO authenticated USING (auth.uid () = user_id);

-- End of Security Hardening