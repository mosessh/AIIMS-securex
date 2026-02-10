import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type UserRole = 'admin' | 'supervisor' | 'guard';

export interface UserWithDetails {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  assignedSites: { id: string; name: string }[];
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserWithDetails[]> => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch supervisor site assignments
      const { data: supervisorSites, error: supervisorSitesError } = await supabase
        .from("supervisor_sites")
        .select("user_id, site_id, sites:site_id(id, name)");

      if (supervisorSitesError) throw supervisorSitesError;

      // Map to combined format
      return profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.id);
        const sites = supervisorSites
          .filter((s) => s.user_id === profile.id)
          .map((s) => ({
            id: (s.sites as any)?.id || "",
            name: (s.sites as any)?.name || "",
          }))
          .filter((s) => s.id);

        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          phone: profile.phone,
          role: (userRole?.role || "guard") as UserRole,
          assignedSites: sites,
          createdAt: profile.created_at,
        };
      });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      fullName: string;
      role: UserRole;
      siteIds?: string[];
    }) => {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");

      // Update role if not guard (default)
      if (data.role !== "guard") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: data.role })
          .eq("user_id", authData.user.id);

        if (roleError) throw roleError;
      }

      // If supervisor, assign sites
      if (data.role === "supervisor" && data.siteIds && data.siteIds.length > 0) {
        const siteAssignments = data.siteIds.map((siteId) => ({
          user_id: authData.user!.id,
          site_id: siteId,
        }));

        const { error: sitesError } = await supabase
          .from("supervisor_sites")
          .insert(siteAssignments);

        if (sitesError) throw sitesError;
      }

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error) => {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete supervisor site assignments first
      await supabase
        .from("supervisor_sites")
        .delete()
        .eq("user_id", userId);

      // Delete user role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete guard record
      await supabase
        .from("guards")
        .delete()
        .eq("user_id", userId);

      // Delete profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      // Note: The auth.users record would need to be deleted via admin API
      // For now, we've cleaned up all the related records
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: data.role })
        .eq("user_id", data.userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated");
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    },
  });
}

export function useAssignSupervisorSites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { userId: string; siteIds: string[] }) => {
      // Delete existing assignments
      await supabase
        .from("supervisor_sites")
        .delete()
        .eq("user_id", data.userId);

      // Insert new assignments
      if (data.siteIds.length > 0) {
        const assignments = data.siteIds.map((siteId) => ({
          user_id: data.userId,
          site_id: siteId,
        }));

        const { error } = await supabase
          .from("supervisor_sites")
          .insert(assignments);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Site assignments updated");
    },
    onError: (error) => {
      console.error("Error assigning sites:", error);
      toast.error("Failed to update site assignments");
    },
  });
}
