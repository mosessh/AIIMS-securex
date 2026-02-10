import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface GuardProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  siteName: string | null;
  siteId: string | null;
  status: string;
  rating: number;
  attendanceRate: number;
}

export interface CheckpointForScan {
  id: string;
  name: string;
  qrCode: string;
  sequenceOrder: number;
  scanInterval: number;
  isRequired: boolean;
  siteName: string;
  siteId: string;
  lastScannedAt?: string;
}

export interface HandoverNote {
  id: string;
  guardId: string;
  guardName: string;
  shiftId: string | null;
  siteId: string;
  siteName: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
}

export function useGuardProfile() {
  const { guardId, user } = useAuth();

  return useQuery({
    queryKey: ["guard-profile", guardId],
    queryFn: async (): Promise<GuardProfile | null> => {
      if (!guardId || !user) return null;

      const { data: guard, error } = await supabase
        .from("guards")
        .select(`
          id,
          user_id,
          site_id,
          status,
          rating,
          attendance_rate,
          sites (id, name)
        `)
        .eq("id", guardId)
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name, phone, avatar_url")
        .eq("id", user.id)
        .single();

      return {
        id: guard.id,
        userId: guard.user_id,
        email: profile?.email || user.email || "",
        fullName: profile?.full_name || "",
        phone: profile?.phone || null,
        avatarUrl: profile?.avatar_url || null,
        siteName: guard.sites?.name || null,
        siteId: guard.site_id,
        status: guard.status,
        rating: guard.rating || 5,
        attendanceRate: guard.attendance_rate || 100,
      };
    },
    enabled: !!guardId && !!user,
  });
}

export function useGuardCheckpoints() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["guard-checkpoints", guardId],
    queryFn: async (): Promise<CheckpointForScan[]> => {
      if (!guardId) return [];

      // Get guard's assigned site
      const { data: guard } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (!guard?.site_id) return [];

      // Get checkpoints for the site
      const { data: checkpoints, error } = await supabase
        .from("checkpoints")
        .select(`
          id,
          name,
          qr_code,
          sequence_order,
          scan_interval,
          is_required,
          site_id,
          sites (id, name)
        `)
        .eq("site_id", guard.site_id)
        .order("sequence_order", { ascending: true });

      if (error) throw error;

      // Get latest scans for each checkpoint
      const { data: latestScans } = await supabase
        .from("patrol_logs")
        .select("checkpoint_id, scanned_at")
        .eq("guard_id", guardId)
        .order("scanned_at", { ascending: false });

      const lastScanMap = new Map<string, string>();
      latestScans?.forEach((scan) => {
        if (!lastScanMap.has(scan.checkpoint_id)) {
          lastScanMap.set(scan.checkpoint_id, scan.scanned_at);
        }
      });

      return checkpoints.map((cp) => ({
        id: cp.id,
        name: cp.name,
        qrCode: cp.qr_code,
        sequenceOrder: cp.sequence_order,
        scanInterval: cp.scan_interval,
        isRequired: cp.is_required,
        siteName: cp.sites?.name || "Unknown",
        siteId: cp.site_id,
        lastScannedAt: lastScanMap.get(cp.id),
      }));
    },
    enabled: !!guardId,
  });
}

export function useScanCheckpoint() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      qrCode,
      notes,
      imageUrl,
      latitude,
      longitude,
    }: {
      qrCode: string;
      notes?: string;
      imageUrl?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      if (!guardId) throw new Error("Guard not found");

      // Find checkpoint by QR code
      const { data: checkpoint, error: cpError } = await supabase
        .from("checkpoints")
        .select("id, scan_interval")
        .eq("qr_code", qrCode)
        .single();

      if (cpError || !checkpoint) {
        throw new Error("Invalid QR code - checkpoint not found");
      }

      // Get active shift
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      // Check if on time (within scan interval)
      const { data: lastScan } = await supabase
        .from("patrol_logs")
        .select("scanned_at")
        .eq("checkpoint_id", checkpoint.id)
        .eq("guard_id", guardId)
        .order("scanned_at", { ascending: false })
        .limit(1)
        .single();

      let isOnTime = true;
      if (lastScan) {
        const lastScanTime = new Date(lastScan.scanned_at);
        const intervalMs = checkpoint.scan_interval * 60 * 1000;
        const now = new Date();
        isOnTime = now.getTime() - lastScanTime.getTime() <= intervalMs * 1.5;
      }

      const { data, error } = await supabase
        .from("patrol_logs")
        .insert({
          checkpoint_id: checkpoint.id,
          guard_id: guardId,
          shift_id: activeShift?.id || null,
          notes,
          image_url: imageUrl,
          latitude,
          longitude,
          is_on_time: isOnTime,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-checkpoints"] });
      queryClient.invalidateQueries({ queryKey: ["guard-patrol-logs"] });
      toast({
        title: "Checkpoint scanned",
        description: "Your patrol log has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGuardPatrolLogs() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["guard-patrol-logs", guardId],
    queryFn: async () => {
      if (!guardId) return [];

      const { data, error } = await supabase
        .from("patrol_logs")
        .select(`
          id,
          scanned_at,
          notes,
          image_url,
          is_on_time,
          latitude,
          longitude,
          checkpoints (id, name, sites (id, name))
        `)
        .eq("guard_id", guardId)
        .order("scanned_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return data.map((log) => ({
        id: log.id,
        scannedAt: log.scanned_at,
        notes: log.notes,
        imageUrl: log.image_url,
        isOnTime: log.is_on_time,
        latitude: log.latitude,
        longitude: log.longitude,
        checkpointName: log.checkpoints?.name || "Unknown",
        siteName: log.checkpoints?.sites?.name || "Unknown",
      }));
    },
    enabled: !!guardId,
  });
}

export function useHandoverNotes() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["handover-notes", guardId],
    queryFn: async (): Promise<HandoverNote[]> => {
      if (!guardId) return [];

      // Get guard's site
      const { data: guard } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (!guard?.site_id) return [];

      const { data, error } = await supabase
        .from("handover_notes")
        .select(`
          id,
          guard_id,
          shift_id,
          site_id,
          content,
          priority,
          acknowledged,
          acknowledged_by,
          acknowledged_at,
          created_at,
          guards (id, user_id),
          sites (id, name)
        `)
        .eq("site_id", guard.site_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get guard names
      const guardUserIds = data.map((note) => note.guards?.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return data.map((note) => ({
        id: note.id,
        guardId: note.guard_id,
        guardName: profileMap.get(note.guards?.user_id) || "Unknown Guard",
        shiftId: note.shift_id,
        siteId: note.site_id,
        siteName: note.sites?.name || "Unknown",
        content: note.content,
        priority: note.priority as HandoverNote["priority"],
        acknowledged: note.acknowledged,
        acknowledgedBy: note.acknowledged_by,
        acknowledgedAt: note.acknowledged_at,
        createdAt: note.created_at,
      }));
    },
    enabled: !!guardId,
  });
}

export function useCreateHandoverNote() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      content,
      priority,
    }: {
      content: string;
      priority: HandoverNote["priority"];
    }) => {
      if (!guardId) throw new Error("Guard not found");

      // Get guard's site and active shift
      const { data: guard } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (!guard?.site_id) throw new Error("No site assigned");

      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      const { data, error } = await supabase
        .from("handover_notes")
        .insert({
          guard_id: guardId,
          site_id: guard.site_id,
          shift_id: activeShift?.id || null,
          content,
          priority,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["handover-notes"] });
      toast({
        title: "Handover note created",
        description: "Your note has been saved for the next shift.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create note",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useGuardIncidents() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["guard-incidents", guardId],
    queryFn: async () => {
      if (!guardId) return [];

      // Get guard's site
      const { data: guard } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (!guard?.site_id) return [];

      const { data, error } = await supabase
        .from("incidents")
        .select(`
          id,
          title,
          description,
          incident_type,
          photo_url,
          resolved,
          created_at,
          guards (id, user_id),
          sites (id, name)
        `)
        .eq("site_id", guard.site_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get guard names
      const guardUserIds = data.map((inc) => inc.guards?.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", guardUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

      return data.map((incident) => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        incidentType: incident.incident_type,
        photoUrl: incident.photo_url,
        resolved: incident.resolved,
        createdAt: incident.created_at,
        guardName: profileMap.get(incident.guards?.user_id) || "Unknown Guard",
        siteName: incident.sites?.name || "Unknown",
      }));
    },
    enabled: !!guardId,
  });
}

export function useCreateIncident() {
  const { guardId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      incidentType,
      photoUrl,
    }: {
      title: string;
      description?: string;
      incidentType: string;
      photoUrl?: string;
    }) => {
      if (!guardId) throw new Error("Guard not found");

      // Get guard's site and active shift
      const { data: guard } = await supabase
        .from("guards")
        .select("site_id")
        .eq("id", guardId)
        .single();

      if (!guard?.site_id) throw new Error("No site assigned");

      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      const { data, error } = await supabase
        .from("incidents")
        .insert({
          guard_id: guardId,
          site_id: guard.site_id,
          shift_id: activeShift?.id || null,
          title,
          description,
          incident_type: incidentType,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-incidents"] });
      toast({
        title: "Incident reported",
        description: "Your incident report has been submitted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to report incident",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      fullName,
      phone,
      avatarUrl,
    }: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, string | undefined> = {};
      if (fullName !== undefined) updates.full_name = fullName;
      if (phone !== undefined) updates.phone = phone;
      if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guard-profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadImage() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      bucket,
      folder,
    }: {
      file: File;
      bucket: "patrol-images" | "avatars";
      folder?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${folder ? folder + "/" : ""}${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useActiveShift() {
  const { guardId } = useAuth();

  return useQuery({
    queryKey: ["active-shift", guardId],
    queryFn: async () => {
      if (!guardId) return null;

      const { data, error } = await supabase
        .from("shifts")
        .select(`
          id,
          start_time,
          end_time,
          status,
          sites (id, name)
        `)
        .eq("guard_id", guardId)
        .eq("status", "active")
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return data
        ? {
            id: data.id,
            startTime: data.start_time,
            endTime: data.end_time,
            status: data.status,
            siteName: data.sites?.name || "Unknown",
            siteId: data.sites?.id,
          }
        : null;
    },
    enabled: !!guardId,
    refetchInterval: 60000, // Refresh every minute
  });
}
