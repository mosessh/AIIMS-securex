import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CheckpointWithSite {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  qrCode: string;
  sequenceOrder: number;
  isRequired: boolean;
  scanInterval: number;
  latitude?: number;
  longitude?: number;
}

export function useCheckpoints() {
  return useQuery({
    queryKey: ["checkpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkpoints")
        .select(`
          id,
          name,
          site_id,
          qr_code,
          sequence_order,
          is_required,
          scan_interval,
          latitude,
          longitude,
          sites (id, name)
        `)
        .order("sequence_order", { ascending: true });

      if (error) throw error;

      return data.map((checkpoint): CheckpointWithSite => ({
        id: checkpoint.id,
        name: checkpoint.name,
        siteId: checkpoint.site_id,
        siteName: checkpoint.sites?.name || "Unknown",
        qrCode: checkpoint.qr_code,
        sequenceOrder: checkpoint.sequence_order,
        isRequired: checkpoint.is_required,
        scanInterval: checkpoint.scan_interval,
        latitude: checkpoint.latitude || undefined,
        longitude: checkpoint.longitude || undefined,
      }));
    },
  });
}
