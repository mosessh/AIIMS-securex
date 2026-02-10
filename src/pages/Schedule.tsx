import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShifts } from "@/hooks/useShifts";
import { useSites } from "@/hooks/useSites";
import { useGuards } from "@/hooks/useGuards";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  addWeeks,
  subWeeks,
  isWithinInterval
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  AlertTriangle,
  MapPin,
  Clock,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shift } from "@/types/guard-tour";

interface ConflictInfo {
  hasConflict: boolean;
  conflictingShift?: Shift;
  message?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const Schedule = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [selectedGuard, setSelectedGuard] = useState<string>("all");
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ date: Date; hour: number } | null>(null);
  const [showAddShiftDialog, setShowAddShiftDialog] = useState(false);
  const [newShiftData, setNewShiftData] = useState<{
    date: Date;
    startHour: number;
    guardId: string;
    siteId: string;
    endHour: number;
  } | null>(null);

  const { data: shifts = [], isLoading: shiftsLoading } = useShifts();
  const { data: sites = [] } = useSites();
  const { data: guards = [] } = useGuards();
  const queryClient = useQueryClient();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      if (selectedSite !== "all" && shift.siteId !== selectedSite) return false;
      if (selectedGuard !== "all" && shift.guardId !== selectedGuard) return false;
      
      const shiftDate = new Date(shift.startTime);
      return weekDays.some(day => isSameDay(shiftDate, day));
    });
  }, [shifts, selectedSite, selectedGuard, weekDays]);

  const getShiftsForDayAndHour = (date: Date, hour: number) => {
    return filteredShifts.filter((shift) => {
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const cellStart = new Date(date);
      cellStart.setHours(hour, 0, 0, 0);
      
      return isWithinInterval(cellStart, { start: shiftStart, end: shiftEnd }) ||
             (isSameDay(shiftStart, date) && shiftStart.getHours() === hour);
    });
  };

  const checkForConflicts = (guardId: string, date: Date, startHour: number, endHour: number, excludeShiftId?: string): ConflictInfo => {
    const conflicting = shifts.find((shift) => {
      if (shift.id === excludeShiftId) return false;
      if (shift.guardId !== guardId) return false;
      
      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      
      if (!isSameDay(shiftStart, date)) return false;
      
      const newStart = startHour;
      const newEnd = endHour;
      const existingStart = shiftStart.getHours();
      const existingEnd = shiftEnd.getHours();
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
    
    if (conflicting) {
      const conflictStart = new Date(conflicting.startTime);
      const conflictEnd = new Date(conflicting.endTime);
      return {
        hasConflict: true,
        conflictingShift: conflicting,
        message: `Conflicts with shift at ${conflicting.siteName} (${format(conflictStart, 'HH:mm')} - ${format(conflictEnd, 'HH:mm')})`
      };
    }
    
    return { hasConflict: false };
  };

  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    if (!draggedShift) return;

    const shiftStart = new Date(draggedShift.startTime);
    const shiftEnd = new Date(draggedShift.endTime);
    const duration = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
    
    const conflict = checkForConflicts(
      draggedShift.guardId, 
      date, 
      hour, 
      hour + duration, 
      draggedShift.id
    );

    if (conflict.hasConflict) {
      setConflictInfo(conflict);
      setPendingDrop({ date, hour });
      setShowConflictDialog(true);
      return;
    }

    await moveShift(draggedShift.id, date, hour);
  };

  const moveShift = async (shiftId: string, date: Date, hour: number) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      if (!shift) return;

      const shiftStart = new Date(shift.startTime);
      const shiftEnd = new Date(shift.endTime);
      const duration = shiftEnd.getTime() - shiftStart.getTime();

      const newStart = new Date(date);
      newStart.setHours(hour, 0, 0, 0);
      const newEnd = new Date(newStart.getTime() + duration);

      const { error } = await supabase
        .from('shifts')
        .update({
          start_time: newStart.toISOString(),
          end_time: newEnd.toISOString(),
        })
        .eq('id', shiftId);

      if (error) throw error;

      toast({
        title: "Shift moved",
        description: `Shift rescheduled to ${format(newStart, 'MMM d, HH:mm')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move shift",
        variant: "destructive",
      });
    } finally {
      setDraggedShift(null);
      setShowConflictDialog(false);
      setPendingDrop(null);
      setConflictInfo(null);
    }
  };

  const handleCellClick = (date: Date, hour: number) => {
    setNewShiftData({
      date,
      startHour: hour,
      endHour: hour + 8,
      guardId: selectedGuard !== "all" ? selectedGuard : "",
      siteId: selectedSite !== "all" ? selectedSite : "",
    });
    setShowAddShiftDialog(true);
  };

  const handleCreateShift = async () => {
    if (!newShiftData || !newShiftData.guardId || !newShiftData.siteId) {
      toast({
        title: "Error",
        description: "Please select a guard and site",
        variant: "destructive",
      });
      return;
    }

    const conflict = checkForConflicts(
      newShiftData.guardId,
      newShiftData.date,
      newShiftData.startHour,
      newShiftData.endHour
    );

    if (conflict.hasConflict) {
      toast({
        title: "Conflict Detected",
        description: conflict.message,
        variant: "destructive",
      });
      return;
    }

    try {
      const startTime = new Date(newShiftData.date);
      startTime.setHours(newShiftData.startHour, 0, 0, 0);
      
      const endTime = new Date(newShiftData.date);
      endTime.setHours(newShiftData.endHour, 0, 0, 0);

      const { error } = await supabase.from('shifts').insert({
        guard_id: newShiftData.guardId,
        site_id: newShiftData.siteId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
      });

      if (error) throw error;

      toast({
        title: "Shift created",
        description: `Shift scheduled for ${format(startTime, 'MMM d, HH:mm')}`,
      });

      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowAddShiftDialog(false);
      setNewShiftData(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create shift",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 border-success text-success';
      case 'completed': return 'bg-muted border-muted-foreground/30 text-muted-foreground';
      case 'scheduled': return 'bg-primary/20 border-primary text-primary';
      case 'missed': return 'bg-destructive/20 border-destructive text-destructive';
      default: return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <AppLayout 
      title="Shift Schedule" 
      subtitle="Drag and drop to reschedule shifts"
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Select value={selectedSite} onValueChange={setSelectedSite}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedGuard} onValueChange={setSelectedGuard}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Guards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guards</SelectItem>
              {guards.map((guard) => (
                <SelectItem key={guard.id} value={guard.id}>{guard.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
              <div className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted">
                Time
              </div>
              {weekDays.map((day) => (
                <div 
                  key={day.toISOString()} 
                  className={cn(
                    "p-3 text-center border-l border-border",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    isSameDay(day, new Date()) && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="max-h-[600px] overflow-y-auto">
              {HOURS.slice(6, 22).map((hour) => (
                <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] min-h-[60px]">
                  <div className="p-2 text-right text-xs text-muted-foreground bg-muted border-b border-border">
                    {format(new Date().setHours(hour), 'HH:00')}
                  </div>
                  {weekDays.map((day) => {
                    const cellShifts = getShiftsForDayAndHour(day, hour);
                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "border-l border-b border-border p-1 min-h-[60px] cursor-pointer hover:bg-muted/50 transition-colors relative",
                          isSameDay(day, new Date()) && "bg-primary/5"
                        )}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day, hour)}
                        onClick={() => cellShifts.length === 0 && handleCellClick(day, hour)}
                      >
                        {cellShifts.map((shift) => {
                          const shiftStart = new Date(shift.startTime);
                          if (shiftStart.getHours() !== hour) return null;
                          
                          const shiftEnd = new Date(shift.endTime);
                          return (
                            <div
                              key={shift.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, shift)}
                              className={cn(
                                "p-2 rounded-md border text-xs cursor-move",
                                getStatusColor(shift.status)
                              )}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <GripVertical className="h-3 w-3 opacity-50" />
                                <span className="font-medium truncate">{shift.guardName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] opacity-80">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{shift.siteName}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] opacity-80">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {format(shiftStart, 'HH:mm')} - {format(shiftEnd, 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-sm text-muted-foreground">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border border-primary" />
          <span className="text-xs">Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/20 border border-success" />
          <span className="text-xs">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted border border-muted-foreground/30" />
          <span className="text-xs">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/20 border border-destructive" />
          <span className="text-xs">Missed</span>
        </div>
      </div>

      {/* Conflict Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Schedule Conflict Detected
            </DialogTitle>
            <DialogDescription>
              {conflictInfo?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConflictDialog(false);
              setDraggedShift(null);
              setPendingDrop(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (draggedShift && pendingDrop) {
                  moveShift(draggedShift.id, pendingDrop.date, pendingDrop.hour);
                }
              }}
            >
              Move Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Shift Dialog */}
      <Dialog open={showAddShiftDialog} onOpenChange={setShowAddShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule New Shift</DialogTitle>
            <DialogDescription>
              {newShiftData && `Create a shift for ${format(newShiftData.date, 'EEEE, MMM d')}`}
            </DialogDescription>
          </DialogHeader>
          
          {newShiftData && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Guard</label>
                <Select 
                  value={newShiftData.guardId} 
                  onValueChange={(v) => setNewShiftData({ ...newShiftData, guardId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select guard" />
                  </SelectTrigger>
                  <SelectContent>
                    {guards.filter(g => g.status === 'active' || g.status === 'off_duty').map((guard) => (
                      <SelectItem key={guard.id} value={guard.id}>{guard.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Site</label>
                <Select 
                  value={newShiftData.siteId} 
                  onValueChange={(v) => setNewShiftData({ ...newShiftData, siteId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.filter(s => s.status === 'active').map((site) => (
                      <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Select 
                    value={String(newShiftData.startHour)} 
                    onValueChange={(v) => setNewShiftData({ ...newShiftData, startHour: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {format(new Date().setHours(h), 'HH:00')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Select 
                    value={String(newShiftData.endHour)} 
                    onValueChange={(v) => setNewShiftData({ ...newShiftData, endHour: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.filter(h => h > newShiftData.startHour).map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {format(new Date().setHours(h), 'HH:00')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddShiftDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateShift}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Schedule;