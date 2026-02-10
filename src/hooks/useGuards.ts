import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Guard } from "@/types/guard-tour";

export function useGuards() {
  return useQuery({
    queryKey: ["guards"],
    queryFn: async () => {
      // Fetch guards with sites
      const { data: guards, error } = await supabase
        .from("guards")
        .select(`
          id,
          user_id,
          status,
          designation,
          rating,
          attendance_rate,
          site_id,
          sites (id, name)
        `);

      if (error) throw error;

      // Fetch profiles for all guards
      const userIds = guards.map((g) => g.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return guards.map((guard): Guard => {
        const profile = profileMap.get(guard.user_id);
        return {
          id: guard.id,
          name: profile?.full_name || "Unknown",
          email: profile?.email || "",
          phone: profile?.phone || "",
          avatar: profile?.avatar_url || undefined,
          status: guard.status,
          role: "guard",
          siteId: guard.site_id || undefined,
          siteName: guard.sites?.name || undefined,
          rating: guard.rating || 5,
          attendanceRate: guard.attendance_rate || 100,
        };
      });
    },
  });
}
