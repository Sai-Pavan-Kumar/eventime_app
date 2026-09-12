-- Migration: 20260912_harden_profile_role_elevation.sql
-- Purpose: Prevent users from self-elevating to admin or unbanning themselves via public API updates

CREATE OR REPLACE FUNCTION public.prevent_profile_role_elevation()
RETURNS TRIGGER AS $$
DECLARE
  caller_is_admin BOOLEAN := false;
BEGIN
  -- If running under service_role (e.g. backend server action using createAdminClient), allow full update
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is existing admin
  IF auth.uid() IS NOT NULL THEN
    SELECT (role = 'admin' OR user_type = 'admin') INTO caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();
  END IF;

  -- If caller is not an admin, lock sensitive security fields to their existing values
  IF NOT COALESCE(caller_is_admin, false) THEN
    NEW.role := OLD.role;
    NEW.user_type := OLD.user_type;
    NEW.is_banned := OLD.is_banned;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_elevation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_elevation();
