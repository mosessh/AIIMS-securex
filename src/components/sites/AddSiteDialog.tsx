import { useState } from "react";
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

const siteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required").max(100, "Name must be less than 100 characters"),
  address: z.string().trim().max(255, "Address must be less than 255 characters").optional(),
  status: z.enum(["active", "inactive"]),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofenceRadius: z.coerce.number().min(50, "Minimum 50m").max(5000, "Maximum 5000m"),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface AddSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSiteDialog({ open, onOpenChange }: AddSiteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      address: "",
      status: "active",
      latitude: "",
      longitude: "",
      geofenceRadius: 500,
    },
  });

  const status = watch("status");

  const onSubmit = async (data: SiteFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("sites").insert({
        name: data.name,
        address: data.address || null,
        status: data.status,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        geofence_radius: data.geofenceRadius,
      });

      if (error) throw error;

      toast({
        title: "Site created",
        description: `${data.name} has been added successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["sites"] });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create site. Please try again.",
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
          <DialogTitle>Add New Site</DialogTitle>
          <DialogDescription>
            Create a new site to monitor. Add checkpoints and assign guards after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Site Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Downtown Office Complex"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="e.g., 123 Main Street, City"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value: "active" | "inactive") => setValue("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7128"
                  {...register("latitude")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  {...register("longitude")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="geofenceRadius">Geofence Radius (meters)</Label>
              <Input
                id="geofenceRadius"
                type="number"
                min={50}
                max={5000}
                step={50}
                placeholder="500"
                {...register("geofenceRadius")}
              />
              {errors.geofenceRadius && (
                <p className="text-sm text-destructive">{errors.geofenceRadius.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Distance in meters for guard location tracking (50-5000m)
              </p>
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
              {isSubmitting ? "Creating..." : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
