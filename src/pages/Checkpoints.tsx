import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddCheckpointDialog } from "@/components/checkpoints/AddCheckpointDialog";
import { ViewQrCodeDialog } from "@/components/checkpoints/ViewQrCodeDialog";
import { useCheckpoints, type CheckpointWithSite } from "@/hooks/useCheckpoints";
import { useSites } from "@/hooks/useSites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, 
  QrCode, 
  Search, 
  Plus, 
  CheckCircle2,
  Clock
} from "lucide-react";

interface CheckpointCardProps {
  checkpoint: CheckpointWithSite;
  onViewQr: (checkpoint: CheckpointWithSite) => void;
}

function CheckpointCard({ checkpoint, onViewQr }: CheckpointCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
            {checkpoint.sequenceOrder}
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{checkpoint.name}</h4>
            <p className="text-sm text-muted-foreground">{checkpoint.siteName}</p>
          </div>
        </div>
        <Badge variant={checkpoint.isRequired ? 'default' : 'secondary'}>
          {checkpoint.isRequired ? 'Required' : 'Optional'}
        </Badge>
      </div>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Every {checkpoint.scanInterval} min</span>
        </div>
        {checkpoint.latitude && checkpoint.longitude && (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>GPS enabled</span>
          </div>
        )}
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => onViewQr(checkpoint)}
      >
        <QrCode className="h-4 w-4 mr-2" />
        View QR Code
      </Button>
    </div>
  );
}

const Checkpoints = () => {
  const { data: checkpoints = [], isLoading } = useCheckpoints();
  const { data: sites = [] } = useSites();
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [viewingCheckpoint, setViewingCheckpoint] = useState<CheckpointWithSite | null>(null);

  const filteredCheckpoints = useMemo(() => {
    return checkpoints.filter((checkpoint) => {
      const matchesSite = siteFilter === "all" || checkpoint.siteId === siteFilter;
      const matchesSearch = checkpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        checkpoint.siteName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSite && matchesSearch;
    });
  }, [checkpoints, siteFilter, searchQuery]);

  const siteCounts = useMemo(() => {
    const counts: Record<string, number> = { all: checkpoints.length };
    checkpoints.forEach((c) => {
      counts[c.siteId] = (counts[c.siteId] || 0) + 1;
    });
    return counts;
  }, [checkpoints]);

  return (
    <AppLayout 
      title="Checkpoints" 
      subtitle={`${checkpoints.length} checkpoints across ${sites.length} sites`}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search checkpoints..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Checkpoint
        </Button>
      </div>

      {/* Site Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge 
          variant={siteFilter === "all" ? "active" : "secondary"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSiteFilter("all")}
        >
          <MapPin className="h-3 w-3 mr-1" />
          All Sites ({siteCounts.all || 0})
        </Badge>
        {sites.slice(0, 5).map((site) => (
          <Badge 
            key={site.id} 
            variant={siteFilter === site.id ? "active" : "secondary"} 
            className="cursor-pointer px-4 py-2"
            onClick={() => setSiteFilter(site.id)}
          >
            {site.name.split(' ')[0]} ({siteCounts[site.id] || 0})
          </Badge>
        ))}
      </div>

      {/* Checkpoints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : filteredCheckpoints.length > 0 ? (
          filteredCheckpoints.map((checkpoint) => (
            <CheckpointCard 
              key={checkpoint.id} 
              checkpoint={checkpoint} 
              onViewQr={setViewingCheckpoint}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || siteFilter !== "all" 
              ? "No checkpoints match your filters" 
              : "No checkpoints found. Add your first checkpoint to get started."}
          </div>
        )}
      </div>

      <AddCheckpointDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      
      <ViewQrCodeDialog 
        open={!!viewingCheckpoint}
        onOpenChange={(open) => !open && setViewingCheckpoint(null)}
        checkpointName={viewingCheckpoint?.name || ""}
        qrCode={viewingCheckpoint?.qrCode || ""}
      />
    </AppLayout>
  );
};

export default Checkpoints;
