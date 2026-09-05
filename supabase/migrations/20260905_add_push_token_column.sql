-- Migration: 20260905_add_push_token_column.sql
-- Ensure push_token column exists on public.profiles with index

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'push_token'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN push_token TEXT;
  END IF;

  -- Ensure notification_preferences column exists with default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN notification_preferences JSONB DEFAULT '{
      "event_reminders": true,
      "campus_alerts": true,
      "city_updates": true,
      "weekly_digest": false,
      "admin_alerts": true
    }'::jsonb;
  END IF;
END $$;

-- Create index for fast push token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token 
ON public.profiles(push_token) 
WHERE push_token IS NOT NULL;
