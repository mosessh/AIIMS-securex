import { Link } from "react-router-dom";
import { SupervisorMobileLayout } from "@/components/layout/SupervisorMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAlerts } from "@/hooks/useAlerts";
import { useGuards } from "@/hooks/useGuards";
import {
  Users,
  Shield,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Activity,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SupervisorHome() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: guards = [], isLoading: guardsLoading } = useGuards();

  const criticalAlerts = alerts.filter(
    (a) => !a.acknowledged && (a.severity === "critical" || a.severity === "high")
  );
  const activeGuards = guards.filter(
    (g) => g.status === "active" || g.status === "on_patrol"
  );

  return (
    <SupervisorMobileLayout title="Dashboard">
      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Guards</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.activeGuards || 0}
                    <span className="text-sm text-muted-foreground font-normal">
                      /{stats?.totalGuards || 0}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">Active now</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/20">
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs text-muted-foreground">Compliance</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.complianceRate || 100}%
                  </p>
                  <p className="text-xs text-muted-foreground">Today's rate</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Patrols</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.activePatrols || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active shifts</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              {statsLoading ? (
                <Skeleton className="h-16" />
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Scans</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats?.checkpointsScanned || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Today's scans</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Critical Alerts
                </span>
                <Badge variant="destructive">{criticalAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.siteName} •{" "}
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    <Badge
                      variant={alert.severity === "critical" ? "destructive" : "default"}
                      className="text-[10px] shrink-0"
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                </div>
              ))}
              <Link to="/supervisor/alerts">
                <div className="flex items-center justify-center gap-1 text-sm text-primary py-2 hover:underline cursor-pointer">
                  View all alerts
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Active Guards Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Guard Status
              </span>
              <Link to="/supervisor/guards">
                <Badge variant="outline" className="cursor-pointer">
                  View All
                </Badge>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {guardsLoading ? (
              <>
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </>
            ) : guards.length > 0 ? (
              guards.slice(0, 5).map((guard) => (
                <div
                  key={guard.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {guard.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {guard.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {guard.siteName || "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      guard.status === "active" || guard.status === "on_patrol"
                        ? "default"
                        : guard.status === "off_duty"
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {guard.status.replace("_", " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No guards found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <Skeleton className="h-24" />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sites Monitored</span>
                  <span className="text-sm font-medium text-foreground">
                    {stats?.sitesMonitored || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alerts Today</span>
                  <span className="text-sm font-medium text-foreground">
                    {stats?.alertsToday || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Incidents Today</span>
                  <span className="text-sm font-medium text-foreground">
                    {stats?.incidentsToday || 0}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Patrol Compliance</span>
                    <span className="text-sm font-medium text-foreground">
                      {stats?.complianceRate || 100}%
                    </span>
                  </div>
                  <Progress value={stats?.complianceRate || 100} className="h-2" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/supervisor/guards">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Manage Guards</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/supervisor/sites">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-success" />
                </div>
                <span className="font-medium text-sm">View Sites</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </SupervisorMobileLayout>
  );
}
