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
import { Site } from "@/types/guard-tour";

const siteSchema = z.object({
  name: z.string().trim().min(1, "Site name is required").max(100, "Name must be less than 100 characters"),
  address: z.string().trim().max(255, "Address must be less than 255 characters").optional(),
  status: z.enum(["active", "inactive"]),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofenceRadius: z.coerce.number().min(50, "Minimum 50m").max(5000, "Maximum 5000m"),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface EditSiteDialogProps {
  site: Site | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSiteDialog({ site, open, onOpenChange }: EditSiteDialogProps) {
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

  useEffect(() => {
    if (site) {
      reset({
        name: site.name,
        address: site.address || "",
        status: site.status,
        latitude: site.latitude?.toString() || "",
        longitude: site.longitude?.toString() || "",
        geofenceRadius: site.geofenceRadius || 500,
      });
    }
  }, [site, reset]);

  const onSubmit = async (data: SiteFormData) => {
    if (!site) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("sites")
        .update({
          name: data.name,
          address: data.address || null,
          status: data.status,
          latitude: data.latitude ? parseFloat(data.latitude) : null,
          longitude: data.longitude ? parseFloat(data.longitude) : null,
          geofence_radius: data.geofenceRadius,
        })
        .eq("id", site.id);

      if (error) throw error;

      toast({
        title: "Site updated",
        description: `${data.name} has been updated successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["sites"] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update site. Please try again.",
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
          <DialogTitle>Edit Site</DialogTitle>
          <DialogDescription>
            Update site details and geofence settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Site Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Downtown Office Complex"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                placeholder="e.g., 123 Main Street, City"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
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
                <Label htmlFor="edit-latitude">Latitude</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7128"
                  {...register("latitude")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-longitude">Longitude</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  {...register("longitude")}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-geofenceRadius">Geofence Radius (meters)</Label>
              <Input
                id="edit-geofenceRadius"
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
