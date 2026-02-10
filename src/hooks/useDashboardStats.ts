import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardStats } from "@/types/guard-tour";

export function useDashboardStats() {
  const queryClient = useQueryClient();

  // Set up real-time subscriptions for related tables
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-stats-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guards" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patrol_logs" },
        () => queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Parallel queries for all stats
      const [
        guardsResult,
        sitesResult,
        shiftsResult,
        alertsResult,
        patrolLogsResult,
        incidentsResult,
      ] = await Promise.all([
        supabase.from("guards").select("id, status"),
        supabase.from("sites").select("id").eq("status", "active"),
        supabase.from("shifts").select("id").eq("status", "active"),
        supabase.from("alerts").select("id").gte("created_at", todayISO),
        supabase.from("patrol_logs").select("id, is_on_time").gte("scanned_at", todayISO),
        supabase.from("incidents").select("id").gte("created_at", todayISO),
      ]);

      const guards = guardsResult.data || [];
      const activeGuards = guards.filter(
        (g) => g.status === "active" || g.status === "on_patrol"
      ).length;

      const patrolLogs = patrolLogsResult.data || [];
      const onTimeLogs = patrolLogs.filter((l) => l.is_on_time).length;
      const complianceRate = patrolLogs.length > 0
        ? Math.round((onTimeLogs / patrolLogs.length) * 100 * 10) / 10
        : 100;

      const stats: DashboardStats = {
        activeGuards,
        totalGuards: guards.length,
        activePatrols: shiftsResult.data?.length || 0,
        sitesMonitored: sitesResult.data?.length || 0,
        alertsToday: alertsResult.data?.length || 0,
        complianceRate,
        checkpointsScanned: patrolLogs.length,
        incidentsToday: incidentsResult.data?.length || 0,
      };

      return stats;
    },
  });
}
