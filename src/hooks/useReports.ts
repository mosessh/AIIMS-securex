import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Report {
  id: string;
  title: string;
  type: 'patrol' | 'incident' | 'attendance' | 'compliance';
  siteId: string | null;
  siteName: string;
  generatedBy: string | null;
  fileUrl: string | null;
  status: 'ready' | 'generating' | 'failed';
  createdAt: string;
}

export function useReports() {
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['reports'],
    queryFn: async (): Promise<Report[]> => {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          title,
          type,
          site_id,
          generated_by,
          file_url,
          status,
          created_at,
          sites (id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((report: any) => ({
        id: report.id,
        title: report.title,
        type: report.type,
        siteId: report.site_id,
        siteName: report.sites?.name || 'All Sites',
        generatedBy: report.generated_by,
        fileUrl: report.file_url,
        status: report.status,
        createdAt: report.created_at,
      }));
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      title,
      type,
      siteId,
    }: {
      title: string;
      type: Report['type'];
      siteId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('reports')
        .insert({
          title,
          type,
          site_id: siteId || null,
          generated_by: user?.id || null,
          status: 'ready',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({
        title: "Report generated",
        description: "Your report has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
