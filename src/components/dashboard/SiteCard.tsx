import { useState } from "react";
import { Site } from "@/types/guard-tour";
import { cn } from "@/lib/utils";
import { Building2, Users, MapPin, TrendingUp, Pencil, Circle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditSiteDialog } from "@/components/sites/EditSiteDialog";
import { DeleteSiteDialog } from "@/components/sites/DeleteSiteDialog";

interface SiteCardProps {
  site: Site;
}

export function SiteCard({ site }: SiteCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const complianceColor = 
    site.complianceScore >= 95 ? 'text-success' :
    site.complianceScore >= 85 ? 'text-warning' : 'text-destructive';
    
  return (
    <>
      <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{site.name}</h4>
              <p className="text-sm text-muted-foreground">{site.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Badge variant={site.status === 'active' ? 'success' : 'inactive'}>
              {site.status}
            </Badge>
          </div>
        </div>
        
        {/* Geofence Radius Display */}
        {site.geofenceRadius && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Circle className="h-3 w-3" />
            <span>Geofence: {site.geofenceRadius}m radius</span>
          </div>
        )}
        
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
            </div>
            <p className="text-lg font-semibold text-foreground">{site.checkpointsCount}</p>
            <p className="text-xs text-muted-foreground">Checkpoints</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-lg font-semibold text-foreground">{site.guardsAssigned}</p>
            <p className="text-xs text-muted-foreground">Guards</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className={cn("text-lg font-semibold", complianceColor)}>
              {site.complianceScore}%
            </p>
            <p className="text-xs text-muted-foreground">Compliance</p>
          </div>
        </div>
      </div>
      
      <EditSiteDialog 
        site={site} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />
      
      <DeleteSiteDialog
        site={site}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      />
    </>
  );
}
