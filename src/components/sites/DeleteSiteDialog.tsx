import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Site } from "@/types/guard-tour";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteSiteDialogProps {
  site: Site;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSiteDialog({ site, open, onOpenChange }: DeleteSiteDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      
      // Delete in order to respect foreign key constraints
      // 1. Delete patrol_logs for checkpoints at this site
      const { data: checkpointIds } = await supabase
        .from("checkpoints")
        .select("id")
        .eq("site_id", site.id);
      
      if (checkpointIds && checkpointIds.length > 0) {
        const { error: patrolLogsError } = await supabase
          .from("patrol_logs")
          .delete()
          .in("checkpoint_id", checkpointIds.map(c => c.id));
        if (patrolLogsError) throw patrolLogsError;
      }

      // 2. Delete checkpoints
      const { error: checkpointsError } = await supabase
        .from("checkpoints")
        .delete()
        .eq("site_id", site.id);
      if (checkpointsError) throw checkpointsError;

      // 3. Delete shifts at this site
      const { error: shiftsError } = await supabase
        .from("shifts")
        .delete()
        .eq("site_id", site.id);
      if (shiftsError) throw shiftsError;

      // 4. Delete incidents at this site
      const { error: incidentsError } = await supabase
        .from("incidents")
        .delete()
        .eq("site_id", site.id);
      if (incidentsError) throw incidentsError;

      // 5. Delete handover_notes at this site
      const { error: handoverError } = await supabase
        .from("handover_notes")
        .delete()
        .eq("site_id", site.id);
      if (handoverError) throw handoverError;

      // 6. Delete geofence_events at this site
      const { error: geofenceError } = await supabase
        .from("geofence_events")
        .delete()
        .eq("site_id", site.id);
      if (geofenceError) throw geofenceError;

      // 7. Delete alerts at this site
      const { error: alertsError } = await supabase
        .from("alerts")
        .delete()
        .eq("site_id", site.id);
      if (alertsError) throw alertsError;

      // 8. Delete panic_alerts at this site
      const { error: panicError } = await supabase
        .from("panic_alerts")
        .delete()
        .eq("site_id", site.id);
      if (panicError) throw panicError;

      // 9. Delete cameras at this site
      const { error: camerasError } = await supabase
        .from("cameras")
        .delete()
        .eq("site_id", site.id);
      if (camerasError) throw camerasError;

      // 10. Delete messages related to this site
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("site_id", site.id);
      if (messagesError) throw messagesError;

      // 11. Delete reports related to this site
      const { error: reportsError } = await supabase
        .from("reports")
        .delete()
        .eq("site_id", site.id);
      if (reportsError) throw reportsError;

      // 12. Delete supervisor_sites assignments
      const { error: supervisorSitesError } = await supabase
        .from("supervisor_sites")
        .delete()
        .eq("site_id", site.id);
      if (supervisorSitesError) throw supervisorSitesError;

      // 13. Unassign guards from this site (set site_id to null)
      const { error: guardsError } = await supabase
        .from("guards")
        .update({ site_id: null })
        .eq("site_id", site.id);
      if (guardsError) throw guardsError;

      // 14. Finally, delete the site
      const { error: siteError } = await supabase
        .from("sites")
        .delete()
        .eq("id", site.id);
      if (siteError) throw siteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      toast({
        title: "Site deleted",
        description: `${site.name} and all related data have been deleted.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete site",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Site
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{site.name}</strong>? This action cannot be undone.
            </p>
            
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
              <p className="text-sm font-medium text-destructive">
                The following data will be permanently deleted:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {site.checkpointsCount}
                  </Badge>
                  Checkpoints and patrol logs
                </li>
                <li className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {site.guardsAssigned}
                  </Badge>
                  Guards will be unassigned
                </li>
                <li>• All shifts at this site</li>
                <li>• All incidents and alerts</li>
                <li>• All handover notes</li>
                <li>• All geofence events</li>
                <li>• All cameras and reports</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              deleteMutation.mutate();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Site"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
