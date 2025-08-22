-- Run this SQL in your Supabase Dashboard SQL Editor
-- This will fix the 406 errors and enable dynamic merchant data loading

-- 1. Add missing fields to merchants table (if not already added)
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS business_phone VARCHAR,
ADD COLUMN IF NOT EXISTS business_email VARCHAR;

-- 2. Create user_preferences table for notification and user settings
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

-- 3. Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for user_preferences (allows users to manage their own preferences)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

-- Create new policies
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

-- 5. Insert sample merchant data for testing
-- This creates a sample merchant that will be linked to your user
INSERT INTO public.merchants (merchant_id, name, business_address, website, industry, business_phone, business_email, status) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000', -- Fixed UUID for testing
  'Crypto Cafe',
  '123 Main St, San Francisco, CA 94105',
  'https://cryptocafe.com',
  'Food & Beverage',
  '+1 (555) 123-4567',
  'contact@cryptocafe.com',
  'active'
) ON CONFLICT (merchant_id) DO UPDATE SET
  name = EXCLUDED.name,
  business_address = EXCLUDED.business_address,
  website = EXCLUDED.website,
  industry = EXCLUDED.industry,
  business_phone = EXCLUDED.business_phone,
  business_email = EXCLUDED.business_email,
  updated_at = now();

-- 6. Update any existing users without merchant_id to use the sample merchant
-- This will link your current user to the sample merchant for testing
UPDATE public.users 
SET merchant_id = '550e8400-e29b-41d4-a716-446655440000',
    updated_at = now()
WHERE merchant_id IS NULL;
