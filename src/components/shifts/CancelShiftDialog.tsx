import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Shift } from "@/types/guard-tour";
import { format } from "date-fns";

interface CancelShiftDialogProps {
  shift: Shift | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelShiftDialog({ shift, open, onOpenChange }: CancelShiftDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleCancel = async () => {
    if (!shift) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shift.id);

      if (error) throw error;

      toast({
        title: "Shift cancelled",
        description: `The shift for ${shift.guardName} on ${format(shift.startTime, "PPP")} has been cancelled.`,
      });

      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel shift. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const canCancel = shift?.status === "scheduled";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Shift</AlertDialogTitle>
          <AlertDialogDescription>
            {canCancel ? (
              <>
                Are you sure you want to cancel this shift?
                <br /><br />
                <strong>Guard:</strong> {shift?.guardName}<br />
                <strong>Site:</strong> {shift?.siteName}<br />
                <strong>Date:</strong> {shift ? format(shift.startTime, "PPP") : ""}<br />
                <strong>Time:</strong> {shift ? `${format(shift.startTime, "HH:mm")} - ${format(shift.endTime, "HH:mm")}` : ""}
                <br /><br />
                This action cannot be undone.
              </>
            ) : (
              "Only scheduled shifts can be cancelled. Active, completed, or missed shifts cannot be removed."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {canCancel && (
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Cancelling..." : "Cancel Shift"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
