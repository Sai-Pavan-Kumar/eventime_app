-- Migration: Backfill +50 ET Score for profiles that completed preferences
-- Base score is 100. Completing profile preferences awards +50 (one-time).
-- This migration updates all profiles that completed preferences but were stuck at base score.

UPDATE public.profiles
SET 
  et_score = COALESCE(et_score, 100) + 50,
  updated_at = NOW()
WHERE 
  (
    is_onboarded = true 
    OR (
      preferred_cities IS NOT NULL 
      AND cardinality(preferred_cities) > 0 
      AND goals IS NOT NULL 
      AND cardinality(goals) > 0
    )
  )
  AND (et_score IS NULL OR et_score <= 120)
  AND username != 'eventime';
