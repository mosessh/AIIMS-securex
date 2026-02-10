import { useState } from "react";
import { SupervisorMobileLayout } from "@/components/layout/SupervisorMobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAlerts, useAcknowledgeAlert } from "@/hooks/useAlerts";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Eye,
  Zap,
  Camera,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const alertIcons: Record<string, typeof AlertTriangle> = {
  missed_checkpoint: Clock,
  late_attendance: Clock,
  sleep_detected: Eye,
  camera_no_activity: Camera,
  panic_button: Zap,
  unauthorized_area: MapPin,
};

const severityColors: Record<string, string> = {
  critical: "border-destructive/50 bg-destructive/5",
  high: "border-warning/50 bg-warning/5",
  medium: "border-primary/30",
  low: "",
};

export default function SupervisorAlerts() {
  const { data: alerts = [], isLoading } = useAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const { toast } = useToast();
  const [filter, setFilter] = useState("unacknowledged");

  const filtered = alerts.filter((a) => {
    if (filter === "unacknowledged") return !a.acknowledged;
    if (filter === "critical") return a.severity === "critical" || a.severity === "high";
    if (filter === "acknowledged") return a.acknowledged;
    return true;
  });

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter(
    (a) => !a.acknowledged && (a.severity === "critical" || a.severity === "high")
  ).length;

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    } catch {
      toast({
        title: "Failed to acknowledge",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <SupervisorMobileLayout title="Alerts">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className={criticalCount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-destructive">{criticalCount}</p>
              <p className="text-[10px] text-muted-foreground">Critical/High</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-foreground">{unacknowledgedCount}</p>
              <p className="text-[10px] text-muted-foreground">Unacknowledged</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="unacknowledged" className="text-xs">Open</TabsTrigger>
            <TabsTrigger value="critical" className="text-xs">Critical</TabsTrigger>
            <TabsTrigger value="acknowledged" className="text-xs">Done</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Alerts List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
              <p className="text-muted-foreground">No alerts to show</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => {
              const Icon = alertIcons[alert.type] || AlertTriangle;
              return (
                <Card
                  key={alert.id}
                  className={severityColors[alert.severity] || ""}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          alert.severity === "critical"
                            ? "bg-destructive/10"
                            : alert.severity === "high"
                            ? "bg-warning/10"
                            : "bg-primary/10"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            alert.severity === "critical"
                              ? "text-destructive"
                              : alert.severity === "high"
                              ? "text-warning"
                              : "text-primary"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground line-clamp-2">
                            {alert.message}
                          </p>
                          <Badge
                            variant={
                              alert.severity === "critical"
                                ? "destructive"
                                : alert.severity === "high"
                                ? "default"
                                : "secondary"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {alert.siteName}
                          </span>
                          {alert.guardName && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                {alert.guardName}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                        </p>

                        {!alert.acknowledged ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 gap-1"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Acknowledge
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1 mt-2 text-xs text-success">
                            <CheckCircle2 className="h-3 w-3" />
                            Acknowledged
                            {alert.acknowledgedAt && (
                              <span className="text-muted-foreground">
                                • {format(alert.acknowledgedAt, "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                        )}
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
