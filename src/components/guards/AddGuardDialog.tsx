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

const guardSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  siteId: z.string().optional(),
  designation: z.string().trim().max(100, "Designation must be less than 100 characters").optional(),
});

type GuardFormData = z.infer<typeof guardSchema>;

interface AddGuardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGuardDialog({ open, onOpenChange }: AddGuardDialogProps) {
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
  } = useForm<GuardFormData>({
    resolver: zodResolver(guardSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      siteId: "",
      designation: "Security Guard",
    },
  });

  const siteId = watch("siteId");

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: GuardFormData) => {
    setIsSubmitting(true);
    try {
      // Create the user account - trigger will create profile, user_role, and guard
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Wait a moment for the trigger to create the guard record
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the guard record that was created by the trigger
      const { data: guardData, error: guardError } = await supabase
        .from("guards")
        .select("id")
        .eq("user_id", authData.user.id)
        .single();

      if (guardError) throw guardError;

      // Update the guard with site assignment and designation
      const updateData: Record<string, unknown> = {};
      if (data.siteId) updateData.site_id = data.siteId;
      if (data.designation) updateData.designation = data.designation;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("guards")
          .update(updateData)
          .eq("id", guardData.id);

        if (updateError) throw updateError;
      }

      // Update profile with phone if provided
      if (data.phone) {
        await supabase
          .from("profiles")
          .update({ phone: data.phone })
          .eq("id", authData.user.id);
      }

      toast({
        title: "Guard created",
        description: `${data.fullName} has been added successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["guards"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create guard. Please try again.";
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
          <DialogTitle>Add New Guard</DialogTitle>
          <DialogDescription>
            Create a new guard account and optionally assign them to a site.
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
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
              {isSubmitting ? "Creating..." : "Create Guard"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
