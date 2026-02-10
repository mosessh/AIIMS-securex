import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Site {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
}

interface GeofenceEvent {
  id: string;
  guardId: string;
  siteId: string;
  siteName: string;
  eventType: "enter" | "exit";
  latitude: number;
  longitude: number;
  createdAt: string;
}

interface GeofenceState {
  isInsideSite: boolean;
  currentSite: Site | null;
  lastEventType: "enter" | "exit" | null;
  isTracking: boolean;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const DEFAULT_GEOFENCE_RADIUS = 500; // meters

export function useGeofencing() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<GeofenceState>({
    isInsideSite: false,
    currentSite: null,
    lastEventType: null,
    isTracking: false,
  });
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastEventRef = useRef<{ siteId: string; eventType: string } | null>(null);

  // Fetch assigned site
  const { data: assignedSite } = useQuery({
    queryKey: ["guard-assigned-site", guardId],
    queryFn: async (): Promise<Site | null> => {
      if (!guardId) return null;

      const { data: guard, error } = await supabase
        .from("guards")
        .select("site_id, sites (id, name, latitude, longitude, geofence_radius)")
        .eq("id", guardId)
        .single();

      if (error || !guard?.sites) return null;

      const site = guard.sites as { id: string; name: string; latitude: number | null; longitude: number | null; geofence_radius: number };
      if (!site.latitude || !site.longitude) return null;

      return {
        id: site.id,
        name: site.name,
        latitude: site.latitude,
        longitude: site.longitude,
        geofenceRadius: site.geofence_radius,
      };
    },
    enabled: !!guardId,
  });

  // Log geofence event mutation
  const logEvent = useMutation({
    mutationFn: async ({
      siteId,
      eventType,
      latitude,
      longitude,
    }: {
      siteId: string;
      eventType: "enter" | "exit";
      latitude: number;
      longitude: number;
    }) => {
      if (!guardId) throw new Error("No guard ID");

      const { error } = await supabase.from("geofence_events").insert({
        guard_id: guardId,
        site_id: siteId,
        event_type: eventType,
        latitude,
        longitude,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["geofence-events"] });
      
      if (variables.eventType === "enter") {
        toast.success("Site Entry Detected", {
          description: `You have entered ${assignedSite?.name || "the site"}`,
        });
      } else {
        toast.info("Site Exit Detected", {
          description: `You have left ${assignedSite?.name || "the site"}`,
        });
      }
    },
  });

  // Check position against geofence
  const checkGeofence = useCallback(
    (position: GeolocationPosition) => {
      if (!assignedSite) return;

      const { latitude, longitude } = position.coords;
      setCurrentPosition({ latitude, longitude });

      const distance = calculateDistance(
        latitude,
        longitude,
        assignedSite.latitude,
        assignedSite.longitude
      );

      const radius = assignedSite.geofenceRadius || DEFAULT_GEOFENCE_RADIUS;
      const isInside = distance <= radius;
      const previousEventKey = `${assignedSite.id}-${isInside ? "enter" : "exit"}`;
      const lastEventKey = lastEventRef.current
        ? `${lastEventRef.current.siteId}-${lastEventRef.current.eventType}`
        : null;

      // Only log if state changed
      if (previousEventKey !== lastEventKey) {
        const eventType = isInside ? "enter" : "exit";
        
        logEvent.mutate({
          siteId: assignedSite.id,
          eventType,
          latitude,
          longitude,
        });

        lastEventRef.current = { siteId: assignedSite.id, eventType };
        
        setState((prev) => ({
          ...prev,
          isInsideSite: isInside,
          currentSite: isInside ? assignedSite : null,
          lastEventType: eventType,
        }));
      }
    },
    [assignedSite, logEvent]
  );

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      checkGeofence,
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location tracking error", {
          description: error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
      }
    );

    setState((prev) => ({ ...prev, isTracking: true }));
    toast.success("Location tracking started");
  }, [checkGeofence]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
    toast.info("Location tracking stopped");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    ...state,
    assignedSite,
    currentPosition,
    startTracking,
    stopTracking,
    geofenceRadius: assignedSite?.geofenceRadius || DEFAULT_GEOFENCE_RADIUS,
  };
}

export function useGeofenceEvents() {
  const { guardId, userRole } = useAuth();

  return useQuery({
    queryKey: ["geofence-events", guardId],
    queryFn: async (): Promise<GeofenceEvent[]> => {
      let query = supabase
        .from("geofence_events")
        .select(`
          id,
          guard_id,
          site_id,
          event_type,
          latitude,
          longitude,
          created_at,
          sites (name)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      // Guards only see their own events
      if (userRole === "guard" && guardId) {
        query = query.eq("guard_id", guardId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((event): GeofenceEvent => ({
        id: event.id,
        guardId: event.guard_id,
        siteId: event.site_id,
        siteName: (event.sites as { name: string })?.name || "Unknown Site",
        eventType: event.event_type as "enter" | "exit",
        latitude: event.latitude,
        longitude: event.longitude,
        createdAt: event.created_at,
      }));
    },
    enabled: !!guardId || userRole === "admin" || userRole === "supervisor",
  });
}
