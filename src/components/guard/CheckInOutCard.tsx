import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGuardAttendance,
  useCheckIn,
  useCheckOut,
} from "@/hooks/useGuardAttendance";
import { useActiveShift } from "@/hooks/useGuardData";
import {
  LogIn,
  LogOut,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Navigation,
} from "lucide-react";
import { format } from "date-fns";

export function CheckInOutCard() {
  const { data: attendance, isLoading: attendanceLoading } = useGuardAttendance();
  const { data: activeShift, isLoading: shiftLoading } = useActiveShift();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please enable location services.");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred.");
        }
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const handleCheckIn = () => {
    if (!location) {
      getLocation();
      return;
    }
    checkIn.mutate(location);
  };

  const handleCheckOut = () => {
    if (!location) {
      getLocation();
      return;
    }
    checkOut.mutate(location);
  };

  const isLoading = attendanceLoading || shiftLoading;
  const isCheckedIn = attendance?.status === "checked_in";
  const hasActiveShift = !!activeShift;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
    );
  }

  if (!hasActiveShift) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">No Active Shift</p>
              <p className="text-sm">You don't have a scheduled shift right now.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isCheckedIn ? "border-success/50 bg-success/5" : "border-primary/50 bg-primary/5"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {isCheckedIn ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <LogIn className="h-4 w-4 text-primary" />
            )}
            Shift Attendance
          </CardTitle>
          <Badge variant={isCheckedIn ? "default" : "secondary"}>
            {isCheckedIn ? "On Duty" : "Not Checked In"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shift Info */}
        {activeShift && (
          <div className="text-sm text-muted-foreground">
            <p>
              Shift: {format(new Date(activeShift.startTime), "h:mm a")} -{" "}
              {format(new Date(activeShift.endTime), "h:mm a")}
            </p>
            <p>Site: {activeShift.siteName}</p>
          </div>
        )}

        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm">
          {isGettingLocation ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-muted-foreground">Getting location...</span>
            </>
          ) : locationError ? (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-destructive text-xs">{locationError}</span>
              <Button variant="link" size="sm" onClick={getLocation} className="h-auto p-0">
                Retry
              </Button>
            </>
          ) : location ? (
            <>
              <Navigation className="h-4 w-4 text-success" />
              <span className="text-success">Location acquired</span>
            </>
          ) : null}
        </div>

        {/* Check In/Out Button */}
        {isCheckedIn ? (
          <Button
            onClick={handleCheckOut}
            disabled={checkOut.isPending || !location}
            variant="destructive"
            className="w-full gap-2"
            size="lg"
          >
            {checkOut.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking Out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Check Out
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleCheckIn}
            disabled={checkIn.isPending || !location}
            className="w-full gap-2"
            size="lg"
          >
            {checkIn.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                Check In with GPS
              </>
            )}
          </Button>
        )}

        {/* GPS Verification Note */}
        <p className="text-xs text-muted-foreground text-center">
          GPS location will be verified to ensure you're at the site
        </p>
      </CardContent>
    </Card>
  );
}
