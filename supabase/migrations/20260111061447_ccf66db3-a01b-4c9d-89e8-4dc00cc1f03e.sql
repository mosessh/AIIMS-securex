-- Create supervisor_sites junction table to assign supervisors to sites
CREATE TABLE public.supervisor_sites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, site_id)
);

-- Enable RLS
ALTER TABLE public.supervisor_sites ENABLE ROW LEVEL SECURITY;

-- Admins can manage supervisor site assignments
CREATE POLICY "Admins can manage supervisor sites"
ON public.supervisor_sites
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Supervisors can view their own assignments
CREATE POLICY "Supervisors can view own assignments"
ON public.supervisor_sites
FOR SELECT
USING (user_id = auth.uid());

-- Create a function to check if a supervisor has access to a site
CREATE OR REPLACE FUNCTION public.supervisor_has_site_access(_user_id uuid, _site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins always have access
  SELECT CASE
    WHEN has_role(_user_id, 'admin') THEN true
    -- Supervisors need explicit assignment
    WHEN has_role(_user_id, 'supervisor') THEN EXISTS (
      SELECT 1 FROM public.supervisor_sites
      WHERE user_id = _user_id AND site_id = _site_id
    )
    -- Guards have access (handled separately by their own data)
    ELSE true
  END;
$$;

-- Update sites RLS to filter for supervisors
DROP POLICY IF EXISTS "Authenticated users can view sites" ON public.sites;

CREATE POLICY "Users can view authorized sites"
ON public.sites
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Guards see all (their specific access is controlled by shift assignments)
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see only assigned sites
  (has_role(auth.uid(), 'supervisor') AND EXISTS (
    SELECT 1 FROM public.supervisor_sites 
    WHERE user_id = auth.uid() AND site_id = sites.id
  ))
);

-- Update checkpoints RLS to filter for supervisors
DROP POLICY IF EXISTS "Authenticated users can view checkpoints" ON public.checkpoints;

CREATE POLICY "Users can view authorized checkpoints"
ON public.checkpoints
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Guards see all
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see checkpoints from their assigned sites
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);

-- Update patrol_logs RLS to filter for supervisors
DROP POLICY IF EXISTS "Users can view patrol logs" ON public.patrol_logs;

CREATE POLICY "Users can view authorized patrol logs"
ON public.patrol_logs
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Guards see all
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see patrol logs for checkpoints in their assigned sites
  (has_role(auth.uid(), 'supervisor') AND EXISTS (
    SELECT 1 FROM public.checkpoints c
    JOIN public.supervisor_sites ss ON c.site_id = ss.site_id
    WHERE c.id = patrol_logs.checkpoint_id AND ss.user_id = auth.uid()
  ))
);

-- Update guards RLS to filter for supervisors (only guards at their sites)
DROP POLICY IF EXISTS "Authenticated users can view guards" ON public.guards;

CREATE POLICY "Users can view authorized guards"
ON public.guards
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Own record
  user_id = auth.uid()
  OR
  -- Guards see all guards
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see guards at their assigned sites
  (has_role(auth.uid(), 'supervisor') AND (
    site_id IS NULL OR EXISTS (
      SELECT 1 FROM public.supervisor_sites 
      WHERE user_id = auth.uid() AND site_id = guards.site_id
    )
  ))
);

-- Update shifts RLS for supervisors
DROP POLICY IF EXISTS "Users can view all shifts" ON public.shifts;

CREATE POLICY "Users can view authorized shifts"
ON public.shifts
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Guards see all (their own filter handled separately)
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see shifts at their assigned sites
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);

-- Update alerts RLS for supervisors
DROP POLICY IF EXISTS "Users can view alerts" ON public.alerts;

CREATE POLICY "Users can view authorized alerts"
ON public.alerts
FOR SELECT
USING (
  -- Admins see all
  has_role(auth.uid(), 'admin')
  OR
  -- Guards see all
  has_role(auth.uid(), 'guard')
  OR
  -- Supervisors see alerts for their assigned sites
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);