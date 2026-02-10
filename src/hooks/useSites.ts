import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Site } from "@/types/guard-tour";

export function useSites() {
  return useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      // Get sites with checkpoint counts and guard counts
      const { data: sites, error } = await supabase
        .from("sites")
        .select(`
          id,
          name,
          address,
          latitude,
          longitude,
          status,
          geofence_radius,
          checkpoints (id),
          guards (id)
        `);

      if (error) throw error;

      return sites.map((site): Site => ({
        id: site.id,
        name: site.name,
        address: site.address || "",
        latitude: site.latitude || undefined,
        longitude: site.longitude || undefined,
        status: site.status,
        checkpointsCount: site.checkpoints?.length || 0,
        guardsAssigned: site.guards?.length || 0,
        complianceScore: 95, // TODO: Calculate from patrol logs
        geofenceRadius: site.geofence_radius,
      }));
    },
  });
}
