import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Shift } from "@/types/guard-tour";

export function useShifts() {
  const queryClient = useQueryClient();

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("shifts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["shifts"],
    queryFn: async () => {
      const { data: shifts, error } = await supabase
        .from("shifts")
        .select(`
          id,
          guard_id,
          site_id,
          start_time,
          end_time,
          status,
          attendance_marked,
          sites (id, name, checkpoints (id))
        `)
        .order("start_time", { ascending: false });

      if (error) throw error;

      // Get guard info
      const guardIds = shifts.map((s) => s.guard_id);
      const { data: guards } = await supabase
        .from("guards")
        .select("id, user_id")
        .in("id", guardIds);

      let guardNameMap = new Map<string, string>();
      
      if (guards && guards.length > 0) {
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

      // Get patrol log counts for each shift
      const shiftIds = shifts.map((s) => s.id);
      const { data: patrolCounts } = await supabase
        .from("patrol_logs")
        .select("shift_id")
        .in("shift_id", shiftIds);

      const countByShift = (patrolCounts || []).reduce((acc, log) => {
        if (log.shift_id) {
          acc[log.shift_id] = (acc[log.shift_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return shifts.map((shift): Shift => ({
        id: shift.id,
        guardId: shift.guard_id,
        guardName: guardNameMap.get(shift.guard_id) || "Unknown",
        siteId: shift.site_id,
        siteName: shift.sites?.name || "Unknown Site",
        startTime: new Date(shift.start_time),
        endTime: new Date(shift.end_time),
        status: shift.status,
        checkpointsCompleted: countByShift[shift.id] || 0,
        totalCheckpoints: shift.sites?.checkpoints?.length || 0,
        attendanceMarked: shift.attendance_marked,
      }));
    },
  });
}
