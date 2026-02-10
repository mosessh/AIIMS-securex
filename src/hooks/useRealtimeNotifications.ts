import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RealtimeNotification {
  id: string;
  type: "alert" | "shift_update" | "incident" | "system";
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  createdAt: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  const addNotification = useCallback((notification: Omit<RealtimeNotification, "id" | "createdAt" | "read">) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount((prev) => prev + 1);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Subscribe to alerts (for admins and supervisors)
    const alertsChannel = supabase
      .channel("realtime-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
        },
        (payload) => {
          if (userRole === "admin" || userRole === "supervisor") {
            const alert = payload.new as {
              id: string;
              type: string;
              severity: string;
              message: string;
            };
            
            addNotification({
              type: "alert",
              title: `New ${alert.severity.toUpperCase()} Alert`,
              message: alert.message,
              severity: alert.severity === "critical" || alert.severity === "high" 
                ? "error" 
                : alert.severity === "medium" 
                ? "warning" 
                : "info",
              data: { alertId: alert.id, alertType: alert.type },
            });

            // Invalidate alerts query
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
          }
        }
      )
      .subscribe();

    // Subscribe to shift changes
    const shiftsChannel = supabase
      .channel("realtime-shifts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shifts",
        },
        (payload) => {
          const shift = payload.new as {
            id: string;
            status: string;
            guard_id: string;
          };

          if (payload.eventType === "UPDATE") {
            if (shift.status === "active") {
              addNotification({
                type: "shift_update",
                title: "Shift Started",
                message: "A guard has started their shift",
                severity: "success",
              });
            } else if (shift.status === "completed") {
              addNotification({
                type: "shift_update",
                title: "Shift Completed",
                message: "A guard has completed their shift",
                severity: "info",
              });
            }
          }

          // Invalidate shifts query
          queryClient.invalidateQueries({ queryKey: ["shifts"] });
        }
      )
      .subscribe();

    // Subscribe to incidents
    const incidentsChannel = supabase
      .channel("realtime-incidents")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incidents",
        },
        (payload) => {
          if (userRole === "admin" || userRole === "supervisor") {
            const incident = payload.new as {
              id: string;
              title: string;
            };

            addNotification({
              type: "incident",
              title: "New Incident Reported",
              message: incident.title,
              severity: "warning",
              data: { incidentId: incident.id },
            });

            // Invalidate incidents query
            queryClient.invalidateQueries({ queryKey: ["incidents"] });
          }
        }
      )
      .subscribe();

    // Subscribe to patrol logs (for tracking activity)
    const patrolChannel = supabase
      .channel("realtime-patrol")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "patrol_logs",
        },
        () => {
          // Just invalidate queries, don't create notification for every scan
          queryClient.invalidateQueries({ queryKey: ["patrol-logs"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(shiftsChannel);
      supabase.removeChannel(incidentsChannel);
      supabase.removeChannel(patrolChannel);
    };
  }, [user, userRole, addNotification, queryClient]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
