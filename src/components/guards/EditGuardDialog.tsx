import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSites } from "@/hooks/useSites";
import type { Guard, GuardStatus } from "@/types/guard-tour";

const editGuardSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  siteId: z.string().optional(),
  designation: z.string().trim().max(100, "Designation must be less than 100 characters").optional(),
  status: z.enum(["active", "on_patrol", "off_duty", "suspended"]),
});

type EditGuardFormData = z.infer<typeof editGuardSchema>;

interface EditGuardDialogProps {
  guard: Guard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGuardDialog({ guard, open, onOpenChange }: EditGuardDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { data: sites = [] } = useSites();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditGuardFormData>({
    resolver: zodResolver(editGuardSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      siteId: "",
      designation: "",
      status: "off_duty",
    },
  });

  const siteId = watch("siteId");
  const status = watch("status");

  useEffect(() => {
    if (guard && open) {
      reset({
        fullName: guard.name,
        phone: guard.phone || "",
        siteId: guard.siteId || "",
        designation: "",
        status: guard.status,
      });
      // Fetch the guard's designation
      fetchGuardDetails(guard.id);
    }
  }, [guard, open, reset]);

  const fetchGuardDetails = async (guardId: string) => {
    const { data } = await supabase
      .from("guards")
      .select("designation")
      .eq("id", guardId)
      .single();
    
    if (data?.designation) {
      setValue("designation", data.designation);
    }
  };

  const onSubmit = async (data: EditGuardFormData) => {
    if (!guard) return;
    
    setIsSubmitting(true);
    try {
      // Get the user_id from the guard record
      const { data: guardData, error: guardFetchError } = await supabase
        .from("guards")
        .select("user_id")
        .eq("id", guard.id)
        .single();

      if (guardFetchError) throw guardFetchError;

      // Update the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          phone: data.phone || null,
        })
        .eq("id", guardData.user_id);

      if (profileError) throw profileError;

      // Update the guard record
      const { error: guardError } = await supabase
        .from("guards")
        .update({
          site_id: data.siteId || null,
          designation: data.designation || "Security Guard",
          status: data.status as GuardStatus,
        })
        .eq("id", guard.id);

      if (guardError) throw guardError;

      toast({
        title: "Guard updated",
        description: `${data.fullName}'s details have been updated.`,
      });

      queryClient.invalidateQueries({ queryKey: ["guards"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update guard. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Guard</DialogTitle>
          <DialogDescription>
            Update guard details and site assignment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="e.g., John Smith"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., +1 234 567 8900"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                placeholder="e.g., Security Guard"
                {...register("designation")}
              />
              {errors.designation && (
                <p className="text-sm text-destructive">{errors.designation.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue("status", value as GuardStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_patrol">On Patrol</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="siteId">Assigned Site</Label>
              <Select
                value={siteId || "none"}
                onValueChange={(value) => setValue("siteId", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No site assigned</SelectItem>
                  {sites
                    .filter((site) => site.status === "active")
                    .map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
