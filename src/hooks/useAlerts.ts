import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Alert } from "@/types/guard-tour";

export function useAlerts() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data: alerts, error } = await supabase
        .from("alerts")
        .select(`
          id,
          type,
          severity,
          message,
          acknowledged,
          acknowledged_at,
          acknowledged_by,
          created_at,
          guard_id,
          site_id,
          sites (id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch guard info for alerts that have guard_id
      const guardIds = alerts
        .filter((a) => a.guard_id)
        .map((a) => a.guard_id as string);
      
      let guardNameMap = new Map<string, string>();
      
      if (guardIds.length > 0) {
        const { data: guards } = await supabase
          .from("guards")
          .select("id, user_id")
          .in("id", guardIds);

        if (guards) {
          const userIds = guards.map((g) => g.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);
          guards.forEach((g) => {
            guardNameMap.set(g.id, profileMap.get(g.user_id) || "Unknown");
          });
        }
      }

      return alerts.map((alert): Alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        acknowledged: alert.acknowledged,
        acknowledgedAt: alert.acknowledged_at ? new Date(alert.acknowledged_at) : undefined,
        timestamp: new Date(alert.created_at),
        guardId: alert.guard_id || undefined,
        guardName: alert.guard_id ? guardNameMap.get(alert.guard_id) : undefined,
        siteId: alert.site_id,
        siteName: alert.sites?.name || "Unknown Site",
      }));
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;

    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };
}
