-- Migration: 20260905_harden_event_reports_and_quota.sql
-- EvenTime Event Reports Security, Quota & RLS Hardening Suite

-- 0. Clean up existing duplicate pending reports keeping the earliest one
DELETE FROM public.event_reports
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY event_id, reporter_id 
             ORDER BY created_at ASC
           ) as row_num
    FROM public.event_reports
    WHERE status = 'pending'
  ) t
  WHERE t.row_num > 1
);

-- 1. Database-Level Unique Constraint: Prevent Duplicate Pending Reports per (event_id, reporter_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_report
  ON public.event_reports (event_id, reporter_id)
  WHERE status = 'pending';

-- 2. Database-Level Quota Enforcer: Max 5 pending reports per user across the platform
CREATE OR REPLACE FUNCTION public.check_event_report_quota()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INT;
BEGIN
  SELECT count(*) INTO v_pending_count
  FROM public.event_reports
  WHERE reporter_id = NEW.reporter_id AND status = 'pending';

  IF v_pending_count >= 5 THEN
    RAISE EXCEPTION 'Report quota exceeded: Maximum 5 pending reports allowed.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate quota trigger
DROP TRIGGER IF EXISTS trg_enforce_event_report_quota ON public.event_reports;
CREATE TRIGGER trg_enforce_event_report_quota
  BEFORE INSERT ON public.event_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_event_report_quota();

-- 3. Enable RLS on event_reports
ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

-- Clean up existing user/admin policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.event_reports;
DROP POLICY IF EXISTS "Users can withdraw their own pending reports" ON public.event_reports;
DROP POLICY IF EXISTS "Users can insert reports" ON public.event_reports;
DROP POLICY IF EXISTS "Users can submit event reports" ON public.event_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.event_reports;
DROP POLICY IF EXISTS "Admins can update event_reports" ON public.event_reports;
DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.event_reports;

-- Policy 1: Authenticated users can view ONLY their own submitted reports
CREATE POLICY "Users can view their own reports"
  ON public.event_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Policy 2: Authenticated users can submit reports (cannot report self, must be pending)
CREATE POLICY "Users can submit event reports"
  ON public.event_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_id
    AND status = 'pending'
    AND (curator_id IS NULL OR reporter_id <> curator_id)
  );

-- Policy 3: Authenticated users can withdraw (delete) their own pending reports
CREATE POLICY "Users can withdraw their own pending reports"
  ON public.event_reports FOR DELETE
  TO authenticated
  USING (
    auth.uid() = reporter_id
    AND status = 'pending'
  );

-- Policy 4: Admins have full access to view, update status, and manage all reports
CREATE POLICY "Admins can view and manage all reports"
  ON public.event_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.user_type = 'admin')
    )
  );
