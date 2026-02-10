import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ShiftCard } from "@/components/dashboard/ActivePatrols";
import { AddShiftDialog } from "@/components/shifts/AddShiftDialog";
import { EditShiftDialog } from "@/components/shifts/EditShiftDialog";
import { CancelShiftDialog } from "@/components/shifts/CancelShiftDialog";
import { useShifts } from "@/hooks/useShifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Calendar as CalendarIcon } from "lucide-react";
import type { Shift, ShiftStatus } from "@/types/guard-tour";

type StatusFilter = ShiftStatus | "all";

const Shifts = () => {
  const { data: shifts = [], isLoading } = useShifts();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [cancellingShift, setCancellingShift] = useState<Shift | null>(null);

  const filteredShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const matchesStatus = statusFilter === "all" || shift.status === statusFilter;
      const matchesSearch = 
        shift.guardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shift.siteName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [shifts, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: shifts.length,
    active: shifts.filter(s => s.status === "active").length,
    scheduled: shifts.filter(s => s.status === "scheduled").length,
    completed: shifts.filter(s => s.status === "completed").length,
    missed: shifts.filter(s => s.status === "missed").length,
  }), [shifts]);

  return (
    <AppLayout 
      title="Shift Management" 
      subtitle={`${statusCounts.active} active shifts • ${statusCounts.scheduled} scheduled`}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shifts..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Shift
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge 
          variant={statusFilter === "all" ? "active" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("all")}
        >
          <CalendarIcon className="h-3 w-3 mr-1" />
          All ({statusCounts.all})
        </Badge>
        <Badge 
          variant={statusFilter === "active" ? "success" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("active")}
        >
          Active ({statusCounts.active})
        </Badge>
        <Badge 
          variant={statusFilter === "scheduled" ? "active" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("scheduled")}
        >
          Scheduled ({statusCounts.scheduled})
        </Badge>
        <Badge 
          variant={statusFilter === "completed" ? "inactive" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({statusCounts.completed})
        </Badge>
        <Badge 
          variant={statusFilter === "missed" ? "alert" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("missed")}
        >
          Missed ({statusCounts.missed})
        </Badge>
      </div>

      {/* Shifts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : filteredShifts.length > 0 ? (
          filteredShifts.map((shift) => (
            <ShiftCard 
              key={shift.id} 
              shift={shift}
              onEdit={setEditingShift}
              onCancel={setCancellingShift}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== "all" 
              ? "No shifts match your filters" 
              : "No shifts found. Schedule your first shift to get started."}
          </div>
        )}
      </div>

      <AddShiftDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <EditShiftDialog 
        shift={editingShift} 
        open={!!editingShift} 
        onOpenChange={(open) => !open && setEditingShift(null)} 
      />
      <CancelShiftDialog 
        shift={cancellingShift} 
        open={!!cancellingShift} 
        onOpenChange={(open) => !open && setCancellingShift(null)} 
      />
    </AppLayout>
  );
};

export default Shifts;
