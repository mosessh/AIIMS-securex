
-- Add SMS API configuration settings if they don't exist
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('sms_provider', 'twilio', 'SMS provider type (twilio, africastalking, etc.)'),
  ('sms_api_key', NULL, 'SMS API Key / Auth Token'),
  ('sms_api_sid', NULL, 'SMS Account SID or API Username'),
  ('sms_sender_number', NULL, 'SMS sender phone number'),
  ('sms_enabled', 'false', 'Whether SMS notifications are enabled'),
  ('smtp_host', NULL, 'SMTP server host'),
  ('smtp_port', '587', 'SMTP server port'),
  ('smtp_user', NULL, 'SMTP username'),
  ('smtp_password', NULL, 'SMTP password'),
  ('onesignal_app_id', NULL, 'OneSignal App ID for push notifications')
ON CONFLICT (key) DO NOTHING;
