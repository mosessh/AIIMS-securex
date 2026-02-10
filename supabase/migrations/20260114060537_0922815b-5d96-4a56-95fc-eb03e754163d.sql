-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('patrol', 'incident', 'attendance', 'compliance')),
  site_id UUID REFERENCES public.sites(id),
  generated_by UUID,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'generating', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can view authorized reports"
  ON public.reports FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'guard') OR
    (has_role(auth.uid(), 'supervisor') AND (site_id IS NULL OR supervisor_has_site_access(auth.uid(), site_id)))
  );

CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  USING (is_admin_or_supervisor(auth.uid()));

-- Create system_settings table for logo, favicon, etc.
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_settings
CREATE POLICY "Anyone can view settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('logo_url', NULL, 'System logo URL'),
  ('favicon_url', NULL, 'System favicon URL'),
  ('company_name', 'Guard Tour System', 'Company/System name'),
  ('qr_scan_interval', '15', 'Default QR scan interval in minutes'),
  ('grace_period', '5', 'Grace period for missed checkpoints in minutes');

-- Enable realtime for reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- Create a function to automatically generate missed checkpoint alerts
CREATE OR REPLACE FUNCTION public.generate_missed_checkpoint_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_checkpoint_name TEXT;
  v_site_id UUID;
BEGIN
  -- Only generate alert if the scan was late
  IF NEW.is_on_time = false THEN
    -- Get checkpoint details
    SELECT name, site_id INTO v_checkpoint_name, v_site_id
    FROM public.checkpoints
    WHERE id = NEW.checkpoint_id;

    -- Insert alert
    INSERT INTO public.alerts (
      type,
      severity,
      message,
      site_id,
      guard_id
    ) VALUES (
      'missed_checkpoint',
      'medium',
      'Checkpoint "' || v_checkpoint_name || '" was scanned late',
      v_site_id,
      NEW.guard_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for late patrol logs
DROP TRIGGER IF EXISTS on_late_patrol_log ON public.patrol_logs;
CREATE TRIGGER on_late_patrol_log
  AFTER INSERT ON public.patrol_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_missed_checkpoint_alert();