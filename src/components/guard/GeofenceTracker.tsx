import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGeofencing } from "@/hooks/useGeofencing";
import {
  MapPin,
  Navigation,
  Play,
  Square,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function GeofenceTracker() {
  const {
    isInsideSite,
    currentSite,
    isTracking,
    assignedSite,
    currentPosition,
    startTracking,
    stopTracking,
    geofenceRadius,
  } = useGeofencing();

  if (!assignedSite) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <div>
              <p className="font-medium">No Site Assigned</p>
              <p className="text-sm">Geofencing requires an assigned site with coordinates.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isInsideSite ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Site Geofencing
          </CardTitle>
          <Badge variant={isInsideSite ? "default" : "secondary"}>
            {isInsideSite ? "Inside Site" : "Outside Site"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Site Info */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{assignedSite.name}</p>
          <p className="text-xs text-muted-foreground">
            Geofence radius: {geofenceRadius}m
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          {isInsideSite ? (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">You are at your assigned site</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-warning">
              <XCircle className="h-5 w-5" />
              <span className="text-sm font-medium">You are outside your site boundary</span>
            </div>
          )}
        </div>

        {/* Current Position */}
        {currentPosition && (
          <div className="text-xs text-muted-foreground">
            <p>
              Current: {currentPosition.latitude.toFixed(6)},{" "}
              {currentPosition.longitude.toFixed(6)}
            </p>
            <p>
              Site: {assignedSite.latitude.toFixed(6)},{" "}
              {assignedSite.longitude.toFixed(6)}
            </p>
          </div>
        )}

        {/* Tracking Toggle */}
        <Button
          variant={isTracking ? "destructive" : "default"}
          size="sm"
          className="w-full gap-2"
          onClick={isTracking ? stopTracking : startTracking}
        >
          {isTracking ? (
            <>
              <Square className="h-4 w-4" />
              Stop Tracking
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Start Location Tracking
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          {isTracking
            ? "Your location is being monitored for site entry/exit"
            : "Start tracking to enable automatic site detection"}
        </p>
      </CardContent>
    </Card>
  );
}
