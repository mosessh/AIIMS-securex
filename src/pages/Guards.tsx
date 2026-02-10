import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { GuardCard } from "@/components/dashboard/GuardCard";
import { AddGuardDialog } from "@/components/guards/AddGuardDialog";
import { EditGuardDialog } from "@/components/guards/EditGuardDialog";
import { useGuards } from "@/hooks/useGuards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Users } from "lucide-react";
import type { Guard, GuardStatus } from "@/types/guard-tour";

type StatusFilter = GuardStatus | "all";

const Guards = () => {
  const { data: guards = [], isLoading } = useGuards();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const filteredGuards = useMemo(() => {
    return guards.filter((guard) => {
      const matchesStatus = statusFilter === "all" || guard.status === statusFilter;
      const matchesSearch = guard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guard.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guard.siteName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [guards, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: guards.length,
    on_patrol: guards.filter(g => g.status === "on_patrol").length,
    active: guards.filter(g => g.status === "active").length,
    off_duty: guards.filter(g => g.status === "off_duty").length,
    suspended: guards.filter(g => g.status === "suspended").length,
  }), [guards]);

  const activeCount = statusCounts.active + statusCounts.on_patrol;

  return (
    <AppLayout 
      title="Guards Management" 
      subtitle={`${guards.length} total guards • ${activeCount} active`}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search guards..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guard
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge 
          variant={statusFilter === "all" ? "active" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("all")}
        >
          <Users className="h-3 w-3 mr-1" />
          All ({statusCounts.all})
        </Badge>
        <Badge 
          variant={statusFilter === "on_patrol" ? "success" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("on_patrol")}
        >
          On Patrol ({statusCounts.on_patrol})
        </Badge>
        <Badge 
          variant={statusFilter === "active" ? "success" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("active")}
        >
          Active ({statusCounts.active})
        </Badge>
        <Badge 
          variant={statusFilter === "off_duty" ? "inactive" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("off_duty")}
        >
          Off Duty ({statusCounts.off_duty})
        </Badge>
        <Badge 
          variant={statusFilter === "suspended" ? "alert" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("suspended")}
        >
          Suspended ({statusCounts.suspended})
        </Badge>
      </div>

      {/* Guards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : filteredGuards.length > 0 ? (
          filteredGuards.map((guard) => (
            <GuardCard key={guard.id} guard={guard} onEdit={setEditingGuard} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== "all" 
              ? "No guards match your filters" 
              : "No guards found. Add your first guard to get started."}
          </div>
        )}
      </div>

      <AddGuardDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <EditGuardDialog 
        guard={editingGuard} 
        open={!!editingGuard} 
        onOpenChange={(open) => !open && setEditingGuard(null)} 
      />
    </AppLayout>
  );
};

export default Guards;
