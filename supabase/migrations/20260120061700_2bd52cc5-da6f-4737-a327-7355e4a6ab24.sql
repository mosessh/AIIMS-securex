-- Create messages table for guard-supervisor communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID,
  site_id UUID REFERENCES public.sites(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'direct' CHECK (message_type IN ('direct', 'broadcast', 'site_broadcast')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (
  sender_id = auth.uid() OR 
  recipient_id = auth.uid() OR
  (message_type = 'broadcast' AND is_admin_or_supervisor(auth.uid())) OR
  (message_type = 'site_broadcast' AND (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'guard') OR
    (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
  ))
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own received messages"
ON public.messages FOR UPDATE
USING (recipient_id = auth.uid());

CREATE POLICY "Admins can manage all messages"
ON public.messages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create geofence_events table for tracking location events
CREATE TABLE public.geofence_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guard_id UUID NOT NULL REFERENCES public.guards(id),
  site_id UUID NOT NULL REFERENCES public.sites(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- Policies for geofence_events
CREATE POLICY "Guards can insert own geofence events"
ON public.geofence_events FOR INSERT
WITH CHECK (guard_id = get_guard_id(auth.uid()));

CREATE POLICY "Users can view authorized geofence events"
ON public.geofence_events FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'guard') OR
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);

CREATE POLICY "Admins can manage geofence events"
ON public.geofence_events FOR ALL
USING (is_admin_or_supervisor(auth.uid()));

-- Create panic_alerts table for emergency alerts
CREATE TABLE public.panic_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guard_id UUID NOT NULL REFERENCES public.guards(id),
  site_id UUID NOT NULL REFERENCES public.sites(id),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.panic_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for panic_alerts
CREATE POLICY "Guards can create panic alerts"
ON public.panic_alerts FOR INSERT
WITH CHECK (guard_id = get_guard_id(auth.uid()));

CREATE POLICY "Users can view authorized panic alerts"
ON public.panic_alerts FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  guard_id = get_guard_id(auth.uid()) OR
  (has_role(auth.uid(), 'supervisor') AND supervisor_has_site_access(auth.uid(), site_id))
);

CREATE POLICY "Admins and supervisors can update panic alerts"
ON public.panic_alerts FOR UPDATE
USING (is_admin_or_supervisor(auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.panic_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_events;

-- Create function to generate critical alert from panic button
CREATE OR REPLACE FUNCTION public.handle_panic_alert()
RETURNS TRIGGER AS $$
DECLARE
  v_site_name TEXT;
  v_guard_name TEXT;
BEGIN
  -- Get site name
  SELECT name INTO v_site_name FROM public.sites WHERE id = NEW.site_id;
  
  -- Get guard name
  SELECT p.full_name INTO v_guard_name
  FROM public.guards g
  JOIN public.profiles p ON p.id = g.user_id
  WHERE g.id = NEW.guard_id;
  
  -- Insert critical alert
  INSERT INTO public.alerts (
    type,
    severity,
    message,
    site_id,
    guard_id
  ) VALUES (
    'panic_button',
    'critical',
    'PANIC ALERT: ' || COALESCE(v_guard_name, 'Guard') || ' triggered emergency at ' || COALESCE(v_site_name, 'Unknown Site') || CASE WHEN NEW.message IS NOT NULL THEN ' - ' || NEW.message ELSE '' END,
    NEW.site_id,
    NEW.guard_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for panic alerts
CREATE TRIGGER on_panic_alert_created
AFTER INSERT ON public.panic_alerts
FOR EACH ROW
EXECUTE FUNCTION public.handle_panic_alert();