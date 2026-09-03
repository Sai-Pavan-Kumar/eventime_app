-- Migration: 20260903_security_and_rls_hardening.sql
-- EvenTime Supabase Security & RLS Hardening Suite

-- 1. Function & Trigger: Automatically enforce 'pending' status for non-admin event creations & updates
CREATE OR REPLACE FUNCTION public.enforce_event_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If attempting to mark event as approved or featured, verify user has admin role
  IF (NEW.status = 'approved' OR NEW.is_featured = true) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND (role = 'admin' OR user_type = 'admin')
    ) THEN
      NEW.status := 'pending';
      NEW.is_featured := false;
    END IF;
  END IF;

  -- Always set creator_id to authenticated user if not already set
  IF NEW.creator_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.creator_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS trg_enforce_event_moderation ON public.events;
CREATE TRIGGER trg_enforce_event_moderation
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_event_moderation_status();

-- 2. Foreign Key Cascade Protection for Curator Profiles
-- Ensure deleting a user profile nullifies creator_id instead of failing on foreign key violations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_creator_id_fkey' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_creator_id_fkey;
    ALTER TABLE public.events
      ADD CONSTRAINT events_creator_id_fkey
      FOREIGN KEY (creator_id) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Row Level Security Policy Enhancements on Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon) to read approved events
DROP POLICY IF EXISTS "Public can view approved events" ON public.events;
CREATE POLICY "Public can view approved events"
  ON public.events FOR SELECT
  USING (status = 'approved');

-- Allow curators to view their own pending/rejected events
DROP POLICY IF EXISTS "Curators can view their own submissions" ON public.events;
CREATE POLICY "Curators can view their own submissions"
  ON public.events FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());

-- Allow authenticated users to submit events
DROP POLICY IF EXISTS "Authenticated users can submit events" ON public.events;
CREATE POLICY "Authenticated users can submit events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id OR creator_id IS NULL);

-- Allow curators to edit their own pending events or Admins to edit any event
DROP POLICY IF EXISTS "Curators can update own pending events or admins all" ON public.events;
CREATE POLICY "Curators can update own pending events or admins all"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    (creator_id = auth.uid() AND status = 'pending')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR user_type = 'admin'))
  );
