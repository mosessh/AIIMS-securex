import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, subWeeks, format, eachDayOfInterval, startOfDay, endOfDay } from "date-fns";

export interface GuardPerformance {
  id: string;
  name: string;
  email: string;
  siteName: string;
  status: string;
  totalPatrols: number;
  onTimeScans: number;
  lateScans: number;
  missedCheckpoints: number;
  complianceRate: number;
  attendanceRate: number;
  rating: number;
  incidentsReported: number;
  shiftsCompleted: number;
  shiftsTotal: number;
  avgResponseTime: number;
}

export interface WeeklyTrend {
  week: string;
  startDate: Date;
  complianceRate: number;
  totalScans: number;
  onTimeScans: number;
}

export interface DailyPatrolData {
  date: string;
  day: string;
  completed: number;
  missed: number;
}

export function useGuardPerformance() {
  return useQuery({
    queryKey: ["guard-performance"],
    queryFn: async (): Promise<GuardPerformance[]> => {
      // Fetch guards with their profiles and sites
      const { data: guards, error: guardsError } = await supabase
        .from("guards")
        .select(`
          id,
          user_id,
          site_id,
          status,
          rating,
          attendance_rate,
          sites (name)
        `);

      if (guardsError) throw guardsError;
      if (!guards || guards.length === 0) return [];

      // Get profiles for guard names
      const userIds = guards.map((g) => g.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get patrol logs for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: patrolLogs } = await supabase
        .from("patrol_logs")
        .select("guard_id, is_on_time, scanned_at")
        .gte("scanned_at", thirtyDaysAgo.toISOString());

      // Group patrol logs by guard
      const patrolsByGuard = new Map<string, { total: number; onTime: number }>();
      patrolLogs?.forEach((log) => {
        const current = patrolsByGuard.get(log.guard_id) || { total: 0, onTime: 0 };
        current.total++;
        if (log.is_on_time) current.onTime++;
        patrolsByGuard.set(log.guard_id, current);
      });

      // Get incidents count by guard
      const { data: incidents } = await supabase
        .from("incidents")
        .select("guard_id")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const incidentsByGuard = new Map<string, number>();
      incidents?.forEach((inc) => {
        incidentsByGuard.set(inc.guard_id, (incidentsByGuard.get(inc.guard_id) || 0) + 1);
      });

      // Get shifts data by guard
      const { data: shifts } = await supabase
        .from("shifts")
        .select("guard_id, status")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const shiftsByGuard = new Map<string, { total: number; completed: number }>();
      shifts?.forEach((shift) => {
        const current = shiftsByGuard.get(shift.guard_id) || { total: 0, completed: 0 };
        current.total++;
        if (shift.status === "completed") current.completed++;
        shiftsByGuard.set(shift.guard_id, current);
      });

      return guards.map((guard): GuardPerformance => {
        const profile = profileMap.get(guard.user_id);
        const patrols = patrolsByGuard.get(guard.id) || { total: 0, onTime: 0 };
        const shiftsData = shiftsByGuard.get(guard.id) || { total: 0, completed: 0 };

        const complianceRate = patrols.total > 0
          ? Math.round((patrols.onTime / patrols.total) * 100 * 10) / 10
          : 100;

        return {
          id: guard.id,
          name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          siteName: (guard.sites as any)?.name || "Unassigned",
          status: guard.status,
          totalPatrols: patrols.total,
          onTimeScans: patrols.onTime,
          lateScans: patrols.total - patrols.onTime,
          missedCheckpoints: 0, // Would need more complex calculation
          complianceRate,
          attendanceRate: guard.attendance_rate || 100,
          rating: guard.rating || 5,
          incidentsReported: incidentsByGuard.get(guard.id) || 0,
          shiftsCompleted: shiftsData.completed,
          shiftsTotal: shiftsData.total,
          avgResponseTime: 2.5, // Placeholder
        };
      });
    },
  });
}

export function useWeeklyTrends() {
  return useQuery({
    queryKey: ["weekly-trends"],
    queryFn: async (): Promise<WeeklyTrend[]> => {
      const weeks: WeeklyTrend[] = [];
      
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });

        const { data: logs } = await supabase
          .from("patrol_logs")
          .select("is_on_time")
          .gte("scanned_at", weekStart.toISOString())
          .lte("scanned_at", weekEnd.toISOString());

        const totalScans = logs?.length || 0;
        const onTimeScans = logs?.filter((l) => l.is_on_time).length || 0;
        const complianceRate = totalScans > 0
          ? Math.round((onTimeScans / totalScans) * 100 * 10) / 10
          : 100;

        weeks.push({
          week: format(weekStart, "MMM d"),
          startDate: weekStart,
          complianceRate,
          totalScans,
          onTimeScans,
        });
      }

      return weeks;
    },
  });
}

export function useDailyPatrolData() {
  return useQuery({
    queryKey: ["daily-patrol-data"],
    queryFn: async (): Promise<DailyPatrolData[]> => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const result: DailyPatrolData[] = [];

      for (const day of days) {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);

        const { data: logs } = await supabase
          .from("patrol_logs")
          .select("is_on_time")
          .gte("scanned_at", dayStart.toISOString())
          .lte("scanned_at", dayEnd.toISOString());

        const completed = logs?.filter((l) => l.is_on_time).length || 0;
        const missed = logs?.filter((l) => !l.is_on_time).length || 0;

        result.push({
          date: format(day, "yyyy-MM-dd"),
          day: format(day, "EEE"),
          completed,
          missed,
        });
      }

      return result;
    },
  });
}

export function useAlertsByType() {
  return useQuery({
    queryKey: ["alerts-by-type"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: alerts } = await supabase
        .from("alerts")
        .select("type")
        .gte("created_at", thirtyDaysAgo.toISOString());

      const typeCounts = new Map<string, number>();
      alerts?.forEach((alert) => {
        typeCounts.set(alert.type, (typeCounts.get(alert.type) || 0) + 1);
      });

      const total = alerts?.length || 1;
      
      return Array.from(typeCounts.entries()).map(([type, count]) => ({
        name: type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        value: Math.round((count / total) * 100),
        count,
      }));
    },
  });
}
