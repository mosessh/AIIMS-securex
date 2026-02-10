import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'auth' | 'patrol' | 'alert' | 'system' | 'api';
  action: string;
  user?: string;
  details?: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

export function useSystemLogs(days: number = 7) {
  return useQuery({
    queryKey: ['system-logs', days],
    queryFn: async (): Promise<SystemLog[]> => {
      const startDate = subDays(new Date(), days).toISOString();
      
      // Fetch patrol logs
      const { data: patrolLogs } = await supabase
        .from('patrol_logs')
        .select(`
          id,
          scanned_at,
          guard_id,
          checkpoint_id,
          is_on_time,
          guards!inner(user_id, profiles:user_id(full_name))
        `)
        .gte('scanned_at', startDate)
        .order('scanned_at', { ascending: false })
        .limit(50);

      // Fetch alerts
      const { data: alerts } = await supabase
        .from('alerts')
        .select(`
          id,
          created_at,
          type,
          severity,
          message,
          acknowledged
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch shift changes
      const { data: shifts } = await supabase
        .from('shifts')
        .select(`
          id,
          updated_at,
          status,
          guard_id,
          guards!inner(user_id, profiles:user_id(full_name))
        `)
        .gte('updated_at', startDate)
        .order('updated_at', { ascending: false })
        .limit(50);

      // Transform to logs format
      const logs: SystemLog[] = [];

      // Patrol logs
      patrolLogs?.forEach((log: any) => {
        logs.push({
          id: `patrol-${log.id}`,
          timestamp: log.scanned_at,
          type: 'patrol',
          action: 'Checkpoint Scanned',
          user: log.guards?.profiles?.full_name || 'Unknown Guard',
          details: log.is_on_time ? 'On time' : 'Late scan',
          status: log.is_on_time ? 'success' : 'warning',
        });
      });

      // Alert logs
      alerts?.forEach((alert: any) => {
        logs.push({
          id: `alert-${alert.id}`,
          timestamp: alert.created_at,
          type: 'alert',
          action: alert.type.replace(/_/g, ' ').toUpperCase(),
          details: alert.message,
          status: alert.severity === 'critical' ? 'error' : 
                  alert.severity === 'high' ? 'warning' : 'info',
        });
      });

      // Shift logs
      shifts?.forEach((shift: any) => {
        logs.push({
          id: `shift-${shift.id}`,
          timestamp: shift.updated_at,
          type: 'system',
          action: `Shift ${shift.status}`,
          user: shift.guards?.profiles?.full_name || 'Unknown Guard',
          status: shift.status === 'completed' ? 'success' : 
                  shift.status === 'missed' ? 'error' : 'info',
        });
      });

      // Sort all logs by timestamp
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 100);
    },
  });
}

export interface ApiConfig {
  name: string;
  key: string;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked?: string;
}

export function useApiConfigurations() {
  return useQuery({
    queryKey: ['api-configurations'],
    queryFn: async (): Promise<ApiConfig[]> => {
      // Check system_settings for configured APIs
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['sms_api_key', 'sms_enabled', 'smtp_host', 'onesignal_app_id', 'ai_vision_endpoint']);

      const settingsMap = new Map(settings?.map((s: any) => [s.key, s.value]) || []);

      const smsConfigured = !!settingsMap.get('sms_api_key');
      const smsEnabled = settingsMap.get('sms_enabled') === 'true';

      return [
        {
          name: 'SMS Provider',
          key: 'twilio_sid',
          status: smsConfigured && smsEnabled ? 'connected' : 'disconnected',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Email (SMTP)',
          key: 'smtp_host',
          status: settingsMap.get('smtp_host') ? 'connected' : 'disconnected',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'Push Notifications (OneSignal)',
          key: 'onesignal_app_id',
          status: settingsMap.get('onesignal_app_id') ? 'connected' : 'disconnected',
          lastChecked: new Date().toISOString(),
        },
        {
          name: 'AI Vision API',
          key: 'ai_vision_endpoint',
          status: 'connected', // Uses built-in Lovable Cloud AI
          lastChecked: new Date().toISOString(),
        },
      ];
    },
  });
}