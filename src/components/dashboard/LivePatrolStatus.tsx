import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, Clock, AlertTriangle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ShiftCheckpointStatus {
  shiftId: string;
  guardName: string;
  siteName: string;
  totalCheckpoints: number;
  scannedCheckpoints: number;
  lastScan: Date | null;
  missedCheckpoints: string[];
  status: "on_track" | "behind" | "missed";
}

export function LivePatrolStatus() {
  const [patrolStatuses, setPatrolStatuses] = useState<ShiftCheckpointStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchPatrolStatus = async () => {
    try {
      // Get active shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select(`
          id,
          guard_id,
          site_id,
          start_time,
          guards!inner (
            user_id
          ),
          sites!inner (
            name
          )
        `)
        .eq("status", "active");

      if (shiftsError) throw shiftsError;
      if (!shifts || shifts.length === 0) {
        setPatrolStatuses([]);
        setIsLoading(false);
        return;
      }

      // Get guard profiles
      const guardUserIds = shifts.map((s: any) => s.guards.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // For each shift, get checkpoint status
      const statuses: ShiftCheckpointStatus[] = await Promise.all(
        shifts.map(async (shift: any) => {
          // Get required checkpoints for the site
          const { data: checkpoints } = await supabase
            .from("checkpoints")
            .select("id, name, scan_interval")
            .eq("site_id", shift.site_id)
            .eq("is_required", true);

          const totalCheckpoints = checkpoints?.length || 0;

          // Get patrol logs for this shift
          const { data: patrolLogs } = await supabase
            .from("patrol_logs")
            .select("checkpoint_id, scanned_at, is_on_time")
            .eq("shift_id", shift.id)
            .order("scanned_at", { ascending: false });

          const scannedCheckpointIds = new Set(patrolLogs?.map(l => l.checkpoint_id) || []);
          const scannedCheckpoints = scannedCheckpointIds.size;

          const lastScan = patrolLogs && patrolLogs.length > 0
            ? new Date(patrolLogs[0].scanned_at)
            : null;

          // Find missed checkpoints (not scanned since start)
          const missedCheckpoints = checkpoints
            ?.filter(cp => !scannedCheckpointIds.has(cp.id))
            .map(cp => cp.name) || [];

          // Determine status
          let status: "on_track" | "behind" | "missed" = "on_track";
          const lateScans = patrolLogs?.filter(l => !l.is_on_time).length || 0;
          
          if (missedCheckpoints.length > 0) {
            status = "missed";
          } else if (lateScans > 0) {
            status = "behind";
          }

          return {
            shiftId: shift.id,
            guardName: profileMap.get(shift.guards.user_id) || "Unknown Guard",
            siteName: shift.sites.name,
            totalCheckpoints,
            scannedCheckpoints,
            lastScan,
            missedCheckpoints,
            status,
          };
        })
      );

      setPatrolStatuses(statuses);
    } catch (error) {
      console.error("Error fetching patrol status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatrolStatus();

    // Set up real-time subscription
    const channel = supabase
      .channel("live-patrol-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patrol_logs" },
        () => {
          fetchPatrolStatus();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shifts" },
        () => {
          fetchPatrolStatus();
        }
      )
      .subscribe();

    // Also poll every 30 seconds for missed checkpoint detection
    const interval = setInterval(fetchPatrolStatus, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const getStatusConfig = (status: ShiftCheckpointStatus["status"]) => {
    switch (status) {
      case "on_track":
        return { label: "On Track", variant: "success" as const, icon: CheckCircle2 };
      case "behind":
        return { label: "Behind", variant: "warning" as const, icon: Clock };
      case "missed":
        return { label: "Missed", variant: "destructive" as const, icon: AlertTriangle };
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Live Patrol Status</h3>
            <p className="text-sm text-muted-foreground">
              {patrolStatuses.length} active patrol{patrolStatuses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex h-2 w-2 animate-pulse rounded-full bg-success" />
      </div>

      <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
        {patrolStatuses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active patrols</p>
          </div>
        ) : (
          patrolStatuses.map((patrol) => {
            const statusConfig = getStatusConfig(patrol.status);
            const StatusIcon = statusConfig.icon;
            const progress = patrol.totalCheckpoints > 0
              ? Math.round((patrol.scannedCheckpoints / patrol.totalCheckpoints) * 100)
              : 0;

            return (
              <div
                key={patrol.shiftId}
                className={cn(
                  "rounded-lg border p-4 transition-all",
                  patrol.status === "missed" && "border-destructive/50 bg-destructive/5",
                  patrol.status === "behind" && "border-warning/50 bg-warning/5",
                  patrol.status === "on_track" && "border-border bg-card/50"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{patrol.guardName}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{patrol.siteName}</span>
                    </div>
                  </div>
                  <Badge variant={statusConfig.variant} className="flex items-center gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Checkpoints</span>
                    <span className="font-medium text-foreground">
                      {patrol.scannedCheckpoints} / {patrol.totalCheckpoints}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {patrol.lastScan && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last scan: {formatDistanceToNow(patrol.lastScan, { addSuffix: true })}
                  </p>
                )}

                {patrol.missedCheckpoints.length > 0 && (
                  <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
                    <p className="text-xs font-medium text-destructive mb-1">
                      Pending checkpoints:
                    </p>
                    <p className="text-xs text-destructive/80">
                      {patrol.missedCheckpoints.slice(0, 3).join(", ")}
                      {patrol.missedCheckpoints.length > 3 && ` +${patrol.missedCheckpoints.length - 3} more`}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
