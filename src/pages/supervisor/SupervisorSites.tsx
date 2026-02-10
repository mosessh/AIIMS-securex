import { SupervisorMobileLayout } from "@/components/layout/SupervisorMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useSites } from "@/hooks/useSites";
import { useGuards } from "@/hooks/useGuards";
import {
  MapPin,
  Users,
  Shield,
  Navigation,
} from "lucide-react";

export default function SupervisorSites() {
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const { data: guards = [] } = useGuards();

  // Count guards per site
  const guardsBySite = guards.reduce((acc, g) => {
    if (g.siteId) {
      acc[g.siteId] = (acc[g.siteId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const activeGuardsBySite = guards
    .filter((g) => g.status === "active" || g.status === "on_patrol")
    .reduce((acc, g) => {
      if (g.siteId) {
        acc[g.siteId] = (acc[g.siteId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

  const activeSites = sites.filter((s) => s.status === "active");

  return (
    <SupervisorMobileLayout title="Sites">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{activeSites.length}</p>
              <p className="text-xs text-muted-foreground">Active Sites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sites.length}</p>
              <p className="text-xs text-muted-foreground">Total Sites</p>
            </CardContent>
          </Card>
        </div>

        {/* Sites List */}
        {sitesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sites configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => {
              const totalGuards = guardsBySite[site.id] || 0;
              const activeGuards = activeGuardsBySite[site.id] || 0;
              const coverage = totalGuards > 0 ? (activeGuards / totalGuards) * 100 : 0;

              return (
                <Card key={site.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{site.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {site.address || "No address set"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={site.status === "active" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {site.status}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      {/* Guard Coverage */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          Guards
                        </span>
                        <span className="font-medium text-foreground">
                          {activeGuards}/{totalGuards} active
                        </span>
                      </div>
                      <Progress value={coverage} className="h-1.5" />

                      {/* Site Details */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {site.checkpointsCount} checkpoints
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3 w-3" />
                          {site.geofenceRadius}m radius
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SupervisorMobileLayout>
  );
}
