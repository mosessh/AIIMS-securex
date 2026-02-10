import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, MapPin, Clock, CheckCircle, Shield } from "lucide-react";
import { usePanicAlerts, useAcknowledgePanic, useResolvePanic } from "@/hooks/usePanicButton";
import { formatDistanceToNow } from "date-fns";

export function PanicAlertsWidget() {
  const { data: alerts = [], isLoading } = usePanicAlerts();
  const acknowledgeMutation = useAcknowledgePanic();
  const resolveMutation = useResolvePanic();

  const activeAlerts = alerts.filter((a) => a.status === "active" || a.status === "acknowledged");

  const handleAcknowledge = (id: string) => {
    acknowledgeMutation.mutate(id);
  };

  const handleResolve = (id: string) => {
    resolveMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <Shield className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Emergency Alerts</CardTitle>
              <p className="text-sm text-muted-foreground">All clear - no active alerts</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-destructive/5 animate-pulse-slow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg text-destructive">
                🚨 Active Emergency Alerts
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {activeAlerts.length} alert{activeAlerts.length > 1 ? "s" : ""} requiring attention
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="animate-pulse">
            {activeAlerts.length} ACTIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.slice(0, 3).map((alert) => (
          <div
            key={alert.id}
            className="rounded-lg border border-destructive/30 bg-background p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{alert.guardName}</span>
                  <Badge
                    variant={alert.status === "active" ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    {alert.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.siteName}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </div>
            </div>

            {alert.message && (
              <p className="text-sm bg-muted/50 p-2 rounded border-l-2 border-destructive">
                "{alert.message}"
              </p>
            )}

            {(alert.latitude && alert.longitude) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <a
                  href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View Location ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {alert.status === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAcknowledge(alert.id)}
                  disabled={acknowledgeMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Acknowledge
                </Button>
              )}
              <Button
                size="sm"
                variant={alert.status === "acknowledged" ? "default" : "secondary"}
                onClick={() => handleResolve(alert.id)}
                disabled={resolveMutation.isPending}
                className="flex-1"
              >
                <Shield className="h-4 w-4 mr-1" />
                Resolve
              </Button>
            </div>
          </div>
        ))}

        {activeAlerts.length > 3 && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            +{activeAlerts.length - 3} more alert{activeAlerts.length - 3 > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
