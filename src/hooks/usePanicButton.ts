import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PanicAlert {
  id: string;
  guardId: string;
  guardName: string;
  siteId: string;
  siteName: string;
  latitude?: number;
  longitude?: number;
  message?: string;
  status: "active" | "acknowledged" | "resolved";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export function usePanicAlerts() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("panic-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["panic-alerts"] });

          if (payload.eventType === "INSERT") {
            // Play audio alert for supervisors/admins
            if (userRole === "admin" || userRole === "supervisor") {
              // Create and play alert sound
              try {
                const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = "sine";
                gainNode.gain.value = 0.3;
                
                oscillator.start();
                setTimeout(() => {
                  oscillator.stop();
                  audioContext.close();
                }, 500);
              } catch (e) {
                console.log("Could not play alert sound", e);
              }

              toast.error("🚨 PANIC ALERT!", {
                description: "A guard has triggered an emergency alert!",
                duration: 10000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, queryClient]);

  return useQuery({
    queryKey: ["panic-alerts"],
    queryFn: async (): Promise<PanicAlert[]> => {
      const { data, error } = await supabase
        .from("panic_alerts")
        .select(`
          id,
          guard_id,
          site_id,
          latitude,
          longitude,
          message,
          status,
          acknowledged_by,
          acknowledged_at,
          resolved_by,
          resolved_at,
          created_at,
          guards (user_id),
          sites (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get guard names
      const guardUserIds = data
        .map((a) => (a.guards as { user_id: string })?.user_id)
        .filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return data.map((alert): PanicAlert => ({
        id: alert.id,
        guardId: alert.guard_id,
        guardName: profileMap.get((alert.guards as { user_id: string })?.user_id) || "Unknown Guard",
        siteId: alert.site_id,
        siteName: (alert.sites as { name: string })?.name || "Unknown Site",
        latitude: alert.latitude || undefined,
        longitude: alert.longitude || undefined,
        message: alert.message || undefined,
        status: alert.status as PanicAlert["status"],
        acknowledgedBy: alert.acknowledged_by || undefined,
        acknowledgedAt: alert.acknowledged_at || undefined,
        resolvedBy: alert.resolved_by || undefined,
        resolvedAt: alert.resolved_at || undefined,
        createdAt: alert.created_at,
      }));
    },
  });
}

export function useTriggerPanic() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
      message,
    }: {
      latitude?: number;
      longitude?: number;
      message?: string;
    }) => {
      if (!guardId) throw new Error("Not authenticated as guard");

      // Get guard's site
      const { data: guard, error: guardError } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (guardError || !guard?.site_id) {
        throw new Error("No site assigned");
      }

      const { data, error } = await supabase
        .from("panic_alerts")
        .insert({
          guard_id: guardId,
          site_id: guard.site_id,
          latitude,
          longitude,
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panic-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Emergency Alert Sent", {
        description: "All supervisors have been notified",
      });
    },
    onError: (error) => {
      toast.error("Failed to send alert", {
        description: error.message,
      });
    },
  });
}

export function useAcknowledgePanic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (panicId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("panic_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", panicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panic-alerts"] });
      toast.success("Alert acknowledged");
    },
  });
}

export function useResolvePanic() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (panicId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("panic_alerts")
        .update({
          status: "resolved",
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", panicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["panic-alerts"] });
      toast.success("Alert resolved");
    },
  });
}
