import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GuardLocation {
  guardId: string;
  guardName: string;
  siteId: string | null;
  siteName: string | null;
  latitude: number;
  longitude: number;
  status: string;
  lastSeen: string;
  eventType: "entry" | "exit" | "tracking";
}

export interface SiteGeofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  guardsCount: number;
  status: string;
}

export function useGuardLocations() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("guard-locations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "geofence_events",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["guard-locations"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["guard-locations"],
    queryFn: async (): Promise<GuardLocation[]> => {
      // Get recent geofence events (last 24 hours)
      const { data: events, error } = await supabase
        .from("geofence_events")
        .select(`
          id,
          guard_id,
          site_id,
          latitude,
          longitude,
          event_type,
          created_at,
          guards (user_id, status),
          sites (name)
        `)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get unique guard locations (most recent per guard)
      const guardLocations = new Map<string, GuardLocation>();
      
      // Get guard names
      const guardUserIds = events
        .map((e) => (e.guards as { user_id: string })?.user_id)
        .filter(Boolean);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      for (const event of events) {
        if (!guardLocations.has(event.guard_id)) {
          const guard = event.guards as { user_id: string; status: string } | null;
          guardLocations.set(event.guard_id, {
            guardId: event.guard_id,
            guardName: profileMap.get(guard?.user_id || "") || "Unknown Guard",
            siteId: event.site_id,
            siteName: (event.sites as { name: string } | null)?.name || null,
            latitude: event.latitude,
            longitude: event.longitude,
            status: guard?.status || "off_duty",
            lastSeen: event.created_at,
            eventType: event.event_type as GuardLocation["eventType"],
          });
        }
      }

      return Array.from(guardLocations.values());
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSiteGeofences() {
  return useQuery({
    queryKey: ["site-geofences"],
    queryFn: async (): Promise<SiteGeofence[]> => {
      const { data: sites, error } = await supabase
        .from("sites")
        .select(`
          id,
          name,
          latitude,
          longitude,
          status,
          geofence_radius
        `)
        .eq("status", "active");

      if (error) throw error;

      // Get guard counts per site
      const { data: guards } = await supabase
        .from("guards")
        .select("site_id")
        .not("site_id", "is", null);

      const guardCounts = new Map<string, number>();
      guards?.forEach((g) => {
        guardCounts.set(g.site_id!, (guardCounts.get(g.site_id!) || 0) + 1);
      });

      return sites
        .filter((site) => site.latitude && site.longitude)
        .map((site) => ({
          id: site.id,
          name: site.name,
          latitude: site.latitude!,
          longitude: site.longitude!,
          radius: site.geofence_radius,
          guardsCount: guardCounts.get(site.id) || 0,
          status: site.status,
        }));
    },
  });
}
