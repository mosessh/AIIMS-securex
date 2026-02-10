import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface SystemSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  companyName: string;
  qrScanInterval: number;
  gracePeriod: number;
  smsProvider: string;
  smsApiKey: string | null;
  smsApiSid: string | null;
  smsSenderNumber: string | null;
  smsEnabled: string;
  smtpHost: string | null;
  smtpPort: string;
  smtpUser: string | null;
  smtpPassword: string | null;
  onesignalAppId: string | null;
}

export function useSystemSettings() {
  const queryClient = useQueryClient();

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_settings'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['system-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async (): Promise<SystemSettings> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap = new Map(data?.map((s: any) => [s.key, s.value]) || []);

      return {
        logoUrl: settingsMap.get('logo_url') || null,
        faviconUrl: settingsMap.get('favicon_url') || null,
        companyName: settingsMap.get('company_name') || 'Guard Tour System',
        qrScanInterval: parseInt(settingsMap.get('qr_scan_interval') || '15', 10),
        gracePeriod: parseInt(settingsMap.get('grace_period') || '5', 10),
        smsProvider: settingsMap.get('sms_provider') || 'twilio',
        smsApiKey: settingsMap.get('sms_api_key') || null,
        smsApiSid: settingsMap.get('sms_api_sid') || null,
        smsSenderNumber: settingsMap.get('sms_sender_number') || null,
        smsEnabled: settingsMap.get('sms_enabled') || 'false',
        smtpHost: settingsMap.get('smtp_host') || null,
        smtpPort: settingsMap.get('smtp_port') || '587',
        smtpUser: settingsMap.get('smtp_user') || null,
        smtpPassword: settingsMap.get('smtp_password') || null,
        onesignalAppId: settingsMap.get('onesignal_app_id') || null,
      };
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: "Setting updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update setting",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadSettingsImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: 'logo' | 'favicon';
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
