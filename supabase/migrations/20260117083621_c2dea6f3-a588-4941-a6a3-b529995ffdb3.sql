-- Update the alert notification trigger to also send push notifications
CREATE OR REPLACE FUNCTION public.notify_critical_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_name TEXT;
BEGIN
  -- Only notify for critical and high severity alerts
  IF NEW.severity IN ('critical', 'high') THEN
    -- Get site name
    SELECT name INTO v_site_name FROM public.sites WHERE id = NEW.site_id;
    
    -- Send email notification
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
    
    -- Send push notification
    PERFORM net.http_post(
      url := 'https://ifjksvcktcglcydkrfyu.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmamtzdmNrdGNnbGN5ZGtyZnl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MDQ5NTAsImV4cCI6MjA4MzM4MDk1MH0.eFxucsg6bWVOTQKtWvCByjA6iOYY_S_t03ez-wa5htI'
      ),
      body := jsonb_build_object(
        'alertId', NEW.id,
        'type', NEW.type,
        'severity', NEW.severity,
        'message', NEW.message,
        'siteName', COALESCE(v_site_name, 'Unknown Site')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;