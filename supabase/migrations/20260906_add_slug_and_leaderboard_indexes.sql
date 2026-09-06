-- Migration: 20260906_add_slug_and_leaderboard_indexes.sql
-- 500MB RAM Shield: Eliminates Sequential Full-Table Scans for High-Concurrency Lookups

-- 1. Slug Lookup Index: O(1) direct pointer lookup for EventDetailScreen and Web Event URLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug 
  ON public.events(slug) 
  WHERE slug IS NOT NULL;

-- 2. Leaderboard Score Index: Eliminates in-memory quicksort for top curators and students
CREATE INDEX IF NOT EXISTS idx_profiles_et_score 
  ON public.profiles(et_score DESC) 
  WHERE et_score IS NOT NULL;

-- 3. City Cohort GIN Index: Accelerates array containment queries on preferred_cities
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_cities 
  ON public.profiles USING GIN (preferred_cities);

-- 4. Category Filter Index: Accelerates CategoryEventsScreen queries with 0 disk scans
CREATE INDEX IF NOT EXISTS idx_events_category_feed 
  ON public.events(category, status, date_string ASC) 
  WHERE status = 'approved';
