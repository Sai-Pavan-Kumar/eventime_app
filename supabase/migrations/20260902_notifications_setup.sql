-- Migration: 20260902_notifications_setup.sql
-- Add push_token and notification_preferences columns to profiles

DO $$ 
BEGIN
  -- 1. Add push_token column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'push_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN push_token TEXT;
  END IF;

  -- 2. Add notification_preferences column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
      "event_reminders": true,
      "campus_alerts": true,
      "city_updates": true,
      "weekly_digest": false
    }'::jsonb;
  END IF;
END $$;

-- 3. Create index for fast push token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token 
ON public.profiles(push_token) 
WHERE push_token IS NOT NULL;

-- 4. Create index for preferred cities lookups
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_cities 
ON public.profiles USING GIN (preferred_cities);
