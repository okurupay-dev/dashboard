-- Fix RLS policies for invitation acceptance
-- Run this in your Supabase SQL editor

-- Enable RLS on pending_users table
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Allow public access for invitation validation (unauthenticated users need to read invitations)
CREATE POLICY "public_pending_users_read" ON public.pending_users
FOR SELECT TO anon, authenticated
USING (true);

-- Allow authenticated users to update their own invitation status
CREATE POLICY "update_own_pending_invitation" ON public.pending_users
FOR UPDATE TO authenticated
USING (email = (auth.jwt() -> 'user_metadata' ->> 'email'))
WITH CHECK (email = (auth.jwt() -> 'user_metadata' ->> 'email'));
