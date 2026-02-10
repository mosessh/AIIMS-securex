import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Users, RefreshCw, Building2, Navigation } from "lucide-react";
import { useGuardLocations, useSiteGeofences } from "@/hooks/useGuardLocations";
import { formatDistanceToNow } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icons
const createGuardIcon = (status: string) => {
  const color = status === "active" || status === "on_patrol" ? "#22c55e" : "#6b7280";
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
      </svg>
    </div>`,
    className: "custom-guard-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const createSiteIcon = () => {
  return L.divIcon({
    html: `<div style="background-color: #3b82f6; width: 40px; height: 40px; border-radius: 8px; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <path d="M9 22v-4h6v4"></path>
        <path d="M8 6h.01"></path>
        <path d="M16 6h.01"></path>
        <path d="M12 6h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M16 10h.01"></path>
        <path d="M16 14h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M8 14h.01"></path>
      </svg>
    </div>`,
    className: "custom-site-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [showGeofences, setShowGeofences] = useState(true);
  
  const { data: guardLocations = [], isLoading: guardsLoading, refetch: refetchGuards } = useGuardLocations();
  const { data: siteGeofences = [], isLoading: sitesLoading } = useSiteGeofences();

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([0, 0], 2);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Keep tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const bounds: L.LatLngExpression[] = [];

    // Add site markers and geofences
    siteGeofences.forEach((site) => {
      bounds.push([site.latitude, site.longitude]);

      // Add geofence circle
      if (showGeofences) {
        L.circle([site.latitude, site.longitude], {
          radius: site.radius,
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.1,
          weight: 2,
          dashArray: "5, 10",
        }).addTo(map);
      }

      // Add site marker
      const siteMarker = L.marker([site.latitude, site.longitude], {
        icon: createSiteIcon(),
      }).addTo(map);

      siteMarker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>${site.name}</strong><br/>
          <span style="color: #6b7280;">Guards: ${site.guardsCount}</span><br/>
          <span style="color: #6b7280;">Radius: ${site.radius}m</span>
        </div>
      `);
    });

    // Add guard markers
    guardLocations.forEach((guard) => {
      bounds.push([guard.latitude, guard.longitude]);

      const guardMarker = L.marker([guard.latitude, guard.longitude], {
        icon: createGuardIcon(guard.status),
      }).addTo(map);

      const statusColor = guard.status === "active" || guard.status === "on_patrol" ? "#22c55e" : "#6b7280";
      guardMarker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>${guard.guardName}</strong><br/>
          <span style="color: ${statusColor}; text-transform: capitalize;">${guard.status.replace("_", " ")}</span><br/>
          ${guard.siteName ? `<span style="color: #6b7280;">Site: ${guard.siteName}</span><br/>` : ""}
          <span style="color: #6b7280; font-size: 12px;">Last seen: ${formatDistanceToNow(new Date(guard.lastSeen), { addSuffix: true })}</span>
        </div>
      `);
    });

    // Fit bounds if we have locations
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 15 });
    }
  }, [guardLocations, siteGeofences, showGeofences]);

  const handleRefresh = () => {
    refetchGuards();
  };

  const isLoading = guardsLoading || sitesLoading;

  return (
    <AppLayout title="Guard Map" subtitle="Real-time guard locations and site geofences">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-5 w-5" />
                  Live Guard Locations
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={showGeofences ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowGeofences(!showGeofences)}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    Geofences
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <Skeleton className="h-[500px] w-full" />
              ) : (
                <div ref={mapRef} className="h-[500px] w-full" />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guard Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Guards</span>
                <Badge variant="outline" className="bg-success/10 text-success">
                  {guardLocations.filter((g) => g.status === "active" || g.status === "on_patrol").length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tracked Locations</span>
                <Badge variant="outline">{guardLocations.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sites with Geofence</span>
                <Badge variant="outline">{siteGeofences.length}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Active Guards List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Recent Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <>
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </>
              ) : guardLocations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No guard locations tracked
                </p>
              ) : (
                guardLocations.slice(0, 10).map((guard) => (
                  <div
                    key={guard.guardId}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        guard.status === "active" || guard.status === "on_patrol"
                          ? "bg-success"
                          : "bg-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{guard.guardName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {guard.siteName || "No site assigned"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {guard.eventType}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sites List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Monitored Sites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {sitesLoading ? (
                <>
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </>
              ) : siteGeofences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sites with geofence configured
                </p>
              ) : (
                siteGeofences.map((site) => (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{site.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {site.guardsCount} guards
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Map;
