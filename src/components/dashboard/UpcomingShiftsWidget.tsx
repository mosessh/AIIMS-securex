import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShifts } from "@/hooks/useShifts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  MoreVertical,
  Play,
  XCircle,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { format, isToday, isTomorrow, differenceInHours, addHours } from "date-fns";

export function UpcomingShiftsWidget() {
  const { data: shifts = [], isLoading } = useShifts();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get upcoming shifts (scheduled, within next 24 hours)
  const now = new Date();
  const upcomingShifts = shifts
    .filter((shift) => {
      const startTime = new Date(shift.startTime);
      return (
        shift.status === "scheduled" &&
        startTime > now &&
        differenceInHours(startTime, now) <= 24
      );
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Get currently active shifts
  const activeShifts = shifts
    .filter((shift) => shift.status === "active")
    .slice(0, 3);

  const handleStartShift = async (shiftId: string) => {
    setActionLoading(shiftId);
    try {
      const { error } = await supabase
        .from("shifts")
        .update({ status: "active" })
        .eq("id", shiftId);

      if (error) throw error;

      toast({
        title: "Shift Started",
        description: "The shift has been activated.",
      });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    } catch (error) {
      toast({
        title: "Failed to start shift",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelShift = async (shiftId: string) => {
    setActionLoading(shiftId);
    try {
      const { error } = await supabase
        .from("shifts")
        .update({ status: "missed" })
        .eq("id", shiftId);

      if (error) throw error;

      toast({
        title: "Shift Cancelled",
        description: "The shift has been marked as cancelled.",
      });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    } catch (error) {
      toast({
        title: "Failed to cancel shift",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getTimeLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isTomorrow(date)) return "Tomorrow";
    return format(date, "EEE, MMM d");
  };

  const getTimeUntil = (date: Date) => {
    const hours = differenceInHours(date, now);
    if (hours < 1) return "Starting soon";
    if (hours === 1) return "In 1 hour";
    return `In ${hours} hours`;
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl border border-border bg-card shadow-card">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border bg-card shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Upcoming Shifts</CardTitle>
              <p className="text-sm text-muted-foreground">Next 24 hours</p>
            </div>
          </div>
          <Link to="/schedule">
            <Button variant="ghost" size="sm" className="gap-1">
              View All
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Active Shifts */}
        {activeShifts.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Currently Active
            </p>
            <div className="space-y-2">
              {activeShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{shift.guardName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {shift.siteName}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" className="bg-success text-success-foreground">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Shifts */}
        {upcomingShifts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Scheduled
            </p>
            {upcomingShifts.map((shift) => {
              const startTime = new Date(shift.startTime);
              const endTime = new Date(shift.endTime);

              return (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{shift.guardName}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {shift.siteName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {getTimeLabel(startTime)}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {getTimeUntil(startTime)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={actionLoading === shift.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStartShift(shift.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCancelShift(shift.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Shift
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeShifts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming shifts</p>
            <p className="text-xs">Schedule shifts from the calendar</p>
            <Link to="/schedule" className="inline-block mt-3">
              <Button variant="outline" size="sm">
                Open Schedule
              </Button>
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
