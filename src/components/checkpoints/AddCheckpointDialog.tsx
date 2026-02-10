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
import { Switch } from "@/components/ui/switch";
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
import { QrCode, Copy, Check } from "lucide-react";

const checkpointSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  siteId: z.string().min(1, "Site is required"),
  sequenceOrder: z.number().min(1, "Sequence order must be at least 1").max(100, "Sequence order must be less than 100"),
  scanInterval: z.number().min(1, "Scan interval must be at least 1 minute").max(120, "Scan interval must be less than 120 minutes"),
  isRequired: z.boolean(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type CheckpointFormData = z.infer<typeof checkpointSchema>;

interface AddCheckpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCheckpointDialog({ open, onOpenChange }: AddCheckpointDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const { data: sites = [] } = useSites();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckpointFormData>({
    resolver: zodResolver(checkpointSchema),
    defaultValues: {
      name: "",
      siteId: "",
      sequenceOrder: 1,
      scanInterval: 15,
      isRequired: true,
    },
  });

  const siteId = watch("siteId");
  const isRequired = watch("isRequired");

  useEffect(() => {
    if (!open) {
      reset();
      setGeneratedQrCode(null);
      setCopied(false);
    }
  }, [open, reset]);

  const generateQrCode = () => {
    // Generate a unique QR code (hex string)
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const qrCode = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setGeneratedQrCode(qrCode);
    return qrCode;
  };

  const copyQrCode = async () => {
    if (generatedQrCode) {
      await navigator.clipboard.writeText(generatedQrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onSubmit = async (data: CheckpointFormData) => {
    setIsSubmitting(true);
    try {
      const qrCode = generatedQrCode || generateQrCode();

      const { error } = await supabase.from("checkpoints").insert({
        name: data.name,
        site_id: data.siteId,
        qr_code: qrCode,
        sequence_order: data.sequenceOrder,
        scan_interval: data.scanInterval,
        is_required: data.isRequired,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      });

      if (error) throw error;

      toast({
        title: "Checkpoint created",
        description: `${data.name} has been added successfully.`,
      });

      queryClient.invalidateQueries({ queryKey: ["checkpoints"] });
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      reset();
      setGeneratedQrCode(null);
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create checkpoint. Please try again.";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Checkpoint</DialogTitle>
          <DialogDescription>
            Create a new checkpoint with a unique QR code for patrol scanning.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Checkpoint Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Entrance"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="siteId">Site *</Label>
              <Select
                value={siteId}
                onValueChange={(value) => setValue("siteId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites
                    .filter((site) => site.status === "active")
                    .map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.siteId && (
                <p className="text-sm text-destructive">{errors.siteId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sequenceOrder">Sequence Order *</Label>
                <Input
                  id="sequenceOrder"
                  type="number"
                  min={1}
                  max={100}
                  {...register("sequenceOrder", { valueAsNumber: true })}
                />
                {errors.sequenceOrder && (
                  <p className="text-sm text-destructive">{errors.sequenceOrder.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scanInterval">Scan Interval (min) *</Label>
                <Input
                  id="scanInterval"
                  type="number"
                  min={1}
                  max={120}
                  {...register("scanInterval", { valueAsNumber: true })}
                />
                {errors.scanInterval && (
                  <p className="text-sm text-destructive">{errors.scanInterval.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="isRequired" className="font-medium">Required Checkpoint</Label>
                <p className="text-sm text-muted-foreground">Guards must scan this checkpoint during patrol</p>
              </div>
              <Switch
                id="isRequired"
                checked={isRequired}
                onCheckedChange={(checked) => setValue("isRequired", checked)}
              />
            </div>

            {/* QR Code Section */}
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  <Label className="font-medium">QR Code</Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateQrCode}
                >
                  Generate
                </Button>
              </div>
              
              {generatedQrCode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background px-3 py-2 text-xs font-mono text-muted-foreground border border-border overflow-x-auto">
                      {generatedQrCode}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={copyQrCode}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This QR code will be used for checkpoint scanning. Save it to generate QR code images.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click "Generate" to create a unique QR code, or one will be auto-generated on save.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude (optional)</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g., 40.7128"
                  {...register("latitude", { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude (optional)</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  {...register("longitude", { valueAsNumber: true })}
                />
              </div>
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
              {isSubmitting ? "Creating..." : "Create Checkpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
