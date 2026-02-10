-- Create a function to send alert notification via edge function
CREATE OR REPLACE FUNCTION public.notify_critical_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify for critical and high severity alerts
  IF NEW.severity IN ('critical', 'high') THEN
    -- Use pg_net to call the edge function
    PERFORM net.http_post(
      url := 'https://ifjksvcktcglcydkrfyu.supabase.co/functions/v1/send-alert-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamtzdmNrdGNnbGN5ZGtyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDQ5NTAsImV4cCI6MjA4MzM4MDk1MH0.eFxucsg6bWVOTQKtWvCByjA6iOYY_S_t03ez-wa5htI'
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'alerts',
        'record', jsonb_build_object(
          'id', NEW.id,
          'type', NEW.type,
          'severity', NEW.severity,
          'message', NEW.message,
          'site_id', NEW.site_id,
          'guard_id', NEW.guard_id,
          'created_at', NEW.created_at
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to send notifications on new alerts
DROP TRIGGER IF EXISTS trigger_notify_critical_alert ON public.alerts;
CREATE TRIGGER trigger_notify_critical_alert
  AFTER INSERT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_critical_alert();