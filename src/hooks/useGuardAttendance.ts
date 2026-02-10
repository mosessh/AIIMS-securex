import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AttendanceRecord {
  id: string;
  shiftId: string;
  guardId: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  status: "pending" | "checked_in" | "checked_out";
}

export function useGuardAttendance() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["guard-attendance", guardId],
    queryFn: async (): Promise<AttendanceRecord | null> => {
      if (!guardId) return null;

      // Get the current active shift
      const { data: activeShift, error } = await supabase
        .from("shifts")
        .select("id, attendance_marked, start_time, end_time")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      if (error || !activeShift) return null;

      return {
        id: activeShift.id,
        shiftId: activeShift.id,
        guardId: guardId,
        checkInTime: activeShift.attendance_marked ? activeShift.start_time : null,
        checkOutTime: null,
        checkInLatitude: null,
        checkInLongitude: null,
        checkOutLatitude: null,
        checkOutLongitude: null,
        status: activeShift.attendance_marked ? "checked_in" : "pending",
      };
    },
    enabled: !!guardId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useCheckIn() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => {
      if (!guardId) throw new Error("Guard not found");

      // Get active shift
      const { data: activeShift, error: shiftError } = await supabase
        .from("shifts")
        .select("id, site_id, sites(latitude, longitude)")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      if (shiftError || !activeShift) {
        throw new Error("No active shift found. Please contact your supervisor.");
      }

      // Verify GPS location if site has coordinates
      const siteLatitude = activeShift.sites?.latitude;
      const siteLongitude = activeShift.sites?.longitude;

      if (siteLatitude && siteLongitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          siteLatitude,
          siteLongitude
        );

        // Allow 500m radius
        if (distance > 500) {
          throw new Error(
            `You are ${Math.round(distance)}m away from the site. Please check in within 500m of the site.`
          );
        }
      }

      // Update shift attendance
      const { error: updateError } = await supabase
        .from("shifts")
        .update({ attendance_marked: true })
        .eq("id", activeShift.id);

      if (updateError) throw updateError;

      // Update guard status to on_patrol
      await supabase
        .from("guards")
        .update({ status: "on_patrol" })
        .eq("id", guardId);

      return { success: true, shiftId: activeShift.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["guard-profile"] });
      queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      toast({
        title: "Checked In Successfully",
        description: "Your shift has started. Stay safe!",
      });
    },
    onError: (error) => {
      toast({
        title: "Check-in Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCheckOut() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
    }: {
      latitude: number;
      longitude: number;
    }) => {
      if (!guardId) throw new Error("Guard not found");

      // Get active shift
      const { data: activeShift, error: shiftError } = await supabase
        .from("shifts")
        .select("id, site_id, sites(latitude, longitude)")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      if (shiftError || !activeShift) {
        throw new Error("No active shift found");
      }

      // Verify GPS location if site has coordinates
      const siteLatitude = activeShift.sites?.latitude;
      const siteLongitude = activeShift.sites?.longitude;

      if (siteLatitude && siteLongitude) {
        const distance = calculateDistance(
          latitude,
          longitude,
          siteLatitude,
          siteLongitude
        );

        // Allow 500m radius
        if (distance > 500) {
          throw new Error(
            `You are ${Math.round(distance)}m away from the site. Please check out within 500m of the site.`
          );
        }
      }

      // Update shift status to completed
      const { error: updateError } = await supabase
        .from("shifts")
        .update({ status: "completed" })
        .eq("id", activeShift.id);

      if (updateError) throw updateError;

      // Update guard status
      await supabase
        .from("guards")
        .update({ status: "active" })
        .eq("id", guardId);

      return { success: true, shiftId: activeShift.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["guard-profile"] });
      queryClient.invalidateQueries({ queryKey: ["active-shift"] });
      toast({
        title: "Checked Out Successfully",
        description: "Your shift has ended. Great work!",
      });
    },
    onError: (error) => {
      toast({
        title: "Check-out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Haversine formula to calculate distance between two coordinates
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
