import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSites } from "@/hooks/useSites";
import { useGuards } from "@/hooks/useGuards";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const shiftSchema = z.object({
  guardId: z.string().min(1, "Guard is required"),
  siteId: z.string().min(1, "Site is required"),
  date: z.date({ required_error: "Date is required" }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
}).refine((data) => {
  const start = data.startTime;
  const end = data.endTime;
  return start < end;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface AddShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddShiftDialog({ open, onOpenChange }: AddShiftDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { data: sites = [] } = useSites();
  const { data: guards = [] } = useGuards();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      guardId: "",
      siteId: "",
      startTime: "08:00",
      endTime: "16:00",
      notes: "",
    },
  });

  const guardId = watch("guardId");
  const siteId = watch("siteId");
  const date = watch("date");

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  // Filter guards to show only active ones
  const availableGuards = guards.filter(
    (g) => g.status === "active" || g.status === "off_duty"
  );

  const onSubmit = async (data: ShiftFormData) => {
    setIsSubmitting(true);
    try {
      // Combine date with time
      const startDateTime = new Date(data.date);
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(data.date);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const { error } = await supabase.from("shifts").insert({
        guard_id: data.guardId,
        site_id: data.siteId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        notes: data.notes || null,
        status: "scheduled",
      });

      if (error) throw error;

      toast({
        title: "Shift scheduled",
        description: `Shift has been scheduled for ${format(data.date, "PPP")}.`,
      });

      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to schedule shift. Please try again.";
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
          <DialogTitle>Schedule New Shift</DialogTitle>
          <DialogDescription>
            Create a new shift for a guard at a specific site.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="guardId">Guard *</Label>
              <Select
                value={guardId}
                onValueChange={(value) => setValue("guardId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a guard" />
                </SelectTrigger>
                <SelectContent>
                  {availableGuards.map((guard) => (
                    <SelectItem key={guard.id} value={guard.id}>
                      {guard.name} ({guard.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guardId && (
                <p className="text-sm text-destructive">{errors.guardId.message}</p>
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

            <div className="grid gap-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setValue("date", d)}
                    initialFocus
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime")}
                />
                {errors.startTime && (
                  <p className="text-sm text-destructive">{errors.startTime.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime")}
                />
                {errors.endTime && (
                  <p className="text-sm text-destructive">{errors.endTime.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                placeholder="Any additional notes for this shift..."
                {...register("notes")}
              />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
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
              {isSubmitting ? "Scheduling..." : "Schedule Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
