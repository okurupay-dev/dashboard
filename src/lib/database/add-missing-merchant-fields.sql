-- Add missing fields to merchants table for settings page
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS business_phone VARCHAR,
ADD COLUMN IF NOT EXISTS business_email VARCHAR;

-- Create user_preferences table for storing user-specific settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  preference_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  theme VARCHAR DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language VARCHAR DEFAULT 'English',
  timezone VARCHAR DEFAULT 'America/New_York',
  notification_email BOOLEAN DEFAULT true,
  notification_push BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  notification_transaction_alerts BOOLEAN DEFAULT true,
  notification_security_alerts BOOLEAN DEFAULT true,
  notification_marketing_updates BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (preference_id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
TO authenticated
USING (user_id IN (
  SELECT user_id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'
));

CREATE POLICY "Users can insert their own preferences"
ON public.user_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id IN (
  SELECT user_id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'
));

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
TO authenticated
USING (user_id IN (
  SELECT user_id FROM public.users WHERE clerk_user_id = auth.jwt() ->> 'sub'
));
