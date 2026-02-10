import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PatrolLog } from "@/types/guard-tour";
import { toast } from "sonner";

export function usePatrolLogs() {
  const queryClient = useQueryClient();

  // Set up real-time subscription with toast notifications
  useEffect(() => {
    const channel = supabase
      .channel("patrol-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patrol_logs",
        },
        async (payload) => {
          // Fetch the full patrol log with related data
          const { data: log } = await supabase
            .from("patrol_logs")
            .select(`id, checkpoints (name), guard_id`)
            .eq("id", payload.new.id)
            .single();

          if (log) {
            // Get guard name
            const { data: guard } = await supabase
              .from("guards")
              .select("user_id")
              .eq("id", log.guard_id)
              .single();

            let guardName = "Guard";
            if (guard) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", guard.user_id)
                .single();
              guardName = profile?.full_name || "Guard";
            }

            toast.success("New Checkpoint Scanned", {
              description: `${guardName} scanned ${log.checkpoints?.name || "checkpoint"}`,
            });
          }

          queryClient.invalidateQueries({ queryKey: ["patrol-logs"] });
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["patrol-logs"],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from("patrol_logs")
        .select(`
          id,
          guard_id,
          checkpoint_id,
          shift_id,
          scanned_at,
          latitude,
          longitude,
          is_on_time,
          notes,
          checkpoints (id, name, site_id)
        `)
        .order("scanned_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return logs.map((log): PatrolLog => ({
        id: log.id,
        guardId: log.guard_id,
        checkpointId: log.checkpoint_id,
        checkpointName: log.checkpoints?.name || "Unknown",
        siteId: log.checkpoints?.site_id || "",
        timestamp: new Date(log.scanned_at),
        latitude: log.latitude || undefined,
        longitude: log.longitude || undefined,
        isOnTime: log.is_on_time,
      }));
    },
  });
}
