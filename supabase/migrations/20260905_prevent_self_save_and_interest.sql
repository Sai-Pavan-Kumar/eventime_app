-- Migration: 20260905_prevent_self_save_and_interest.sql
-- EvenTime Security Hardening: Anti-Farming Guard
-- Purpose: Prevent curators from saving or marking interest on their own events to prevent ET Score inflation

CREATE OR REPLACE FUNCTION public.check_prevent_self_save_or_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_id uuid;
BEGIN
  -- Lookup event creator
  SELECT creator_id INTO v_creator_id
  FROM public.events
  WHERE id = NEW.event_id;

  -- Block action if user is attempting to save or express interest on their own event
  IF v_creator_id IS NOT NULL AND NEW.user_id = v_creator_id THEN
    RAISE EXCEPTION 'Curators cannot save or mark interest on their own events.';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for saved_events
DROP TRIGGER IF EXISTS trg_prevent_self_save ON public.saved_events;
CREATE TRIGGER trg_prevent_self_save
  BEFORE INSERT ON public.saved_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_prevent_self_save_or_interest();

-- Trigger for interested_events
DROP TRIGGER IF EXISTS trg_prevent_self_interest ON public.interested_events;
CREATE TRIGGER trg_prevent_self_interest
  BEFORE INSERT ON public.interested_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_prevent_self_save_or_interest();
