-- Migration: 20260904_performance_indexes.sql
-- High-concurrency performance indexes for EvenTime feeds and searches

-- 1. Composite index for HomeScreen public feed queries (status + upcoming date + recency)
CREATE INDEX IF NOT EXISTS idx_events_public_feed 
  ON public.events(status, date_string ASC, created_at DESC)
  WHERE status = 'approved';

-- 2. Index for city-filtered queries (CityEventsScreen & HomeScreen Around You)
CREATE INDEX IF NOT EXISTS idx_events_city_feed 
  ON public.events(city, status, date_string ASC)
  WHERE status = 'approved';

-- 3. Index for student campus feeds (college-restricted events)
CREATE INDEX IF NOT EXISTS idx_events_campus_feed 
  ON public.events(college_id, status, date_string ASC)
  WHERE college_id IS NOT NULL;

-- 4. Index for saved events user lookups
CREATE INDEX IF NOT EXISTS idx_saved_events_user_lookup 
  ON public.saved_events(user_id, event_id);

-- 5. Index for event attendees / interested counts
CREATE INDEX IF NOT EXISTS idx_interested_events_lookup 
  ON public.interested_events(event_id, user_id);
