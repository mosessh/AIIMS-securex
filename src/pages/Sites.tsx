import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { AddSiteDialog } from "@/components/sites/AddSiteDialog";
import { useSites } from "@/hooks/useSites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Building2 } from "lucide-react";

type StatusFilter = "all" | "active" | "inactive";

const Sites = () => {
  const { data: sites = [], isLoading } = useSites();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesStatus = statusFilter === "all" || site.status === statusFilter;
      const matchesSearch = 
        site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [sites, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: sites.length,
    active: sites.filter(s => s.status === "active").length,
    inactive: sites.filter(s => s.status === "inactive").length,
  }), [sites]);

  return (
    <AppLayout 
      title="Sites Management" 
      subtitle={`${sites.length} sites monitored`}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sites..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
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
          <Building2 className="h-3 w-3 mr-1" />
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
          variant={statusFilter === "inactive" ? "inactive" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setStatusFilter("inactive")}
        >
          Inactive ({statusCounts.inactive})
        </Badge>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))
        ) : filteredSites.length > 0 ? (
          filteredSites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || statusFilter !== "all" 
              ? "No sites match your filters" 
              : "No sites found. Add your first site to get started."}
          </div>
        )}
      </div>

      <AddSiteDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </AppLayout>
  );
};

export default Sites;
