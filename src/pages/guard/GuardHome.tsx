import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckInOutCard } from "@/components/guard/CheckInOutCard";
import { PanicButton } from "@/components/guard/PanicButton";
import { GeofenceTracker } from "@/components/guard/GeofenceTracker";
import {
  useGuardProfile,
  useGuardCheckpoints,
  useActiveShift,
  useHandoverNotes,
} from "@/hooks/useGuardData";
import {
  ScanLine,
  Clock,
  MapPin,
  AlertTriangle,
  FileText,
  Bell,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow, differenceInMinutes } from "date-fns";

export default function GuardHome() {
  const { guardId, userRole, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGuardProfile();
  const { data: checkpoints = [], isLoading: checkpointsLoading } = useGuardCheckpoints();
  const { data: activeShift } = useActiveShift();
  const { data: handoverNotes = [] } = useHandoverNotes();
  const [nextCheckpointTime, setNextCheckpointTime] = useState<number | null>(null);
  const [alertActive, setAlertActive] = useState(false);

  // Calculate next checkpoint countdown - MUST be before any conditional returns
  useEffect(() => {
    const calculateNextCheckpoint = () => {
      if (checkpoints.length === 0) return;

      let earliestDue: Date | null = null;

      checkpoints.forEach((cp) => {
        if (cp.lastScannedAt) {
          const lastScan = new Date(cp.lastScannedAt);
          const nextDue = new Date(lastScan.getTime() + cp.scanInterval * 60 * 1000);
          if (!earliestDue || nextDue < earliestDue) {
            earliestDue = nextDue;
          }
        } else {
          // Never scanned - due now
          earliestDue = new Date();
        }
      });

      if (earliestDue) {
        const minsUntilDue = differenceInMinutes(earliestDue, new Date());
        setNextCheckpointTime(Math.max(0, minsUntilDue));
        
        // Trigger alert if less than 2 minutes remaining
        if (minsUntilDue <= 2 && minsUntilDue > 0) {
          setAlertActive(true);
        } else {
          setAlertActive(false);
        }
      }
    };

    calculateNextCheckpoint();
    const interval = setInterval(calculateNextCheckpoint, 30000);
    return () => clearInterval(interval);
  }, [checkpoints]);

  // If user is not a guard, show access denied message
  if (!authLoading && userRole !== 'guard') {
    return (
      <GuardMobileLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Guard Access Only</h2>
          <p className="text-muted-foreground mb-4">
            This page is only accessible to users with the guard role.
          </p>
          <Link to="/">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </GuardMobileLayout>
    );
  }

  // Show loading while auth is still loading
  if (authLoading) {
    return (
      <GuardMobileLayout title="Dashboard">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Skeleton className="h-32 w-full" />
        </div>
      </GuardMobileLayout>
    );
  }

  const unacknowledgedNotes = handoverNotes.filter((n) => !n.acknowledged);
  const scannedToday = checkpoints.filter((cp) => {
    if (!cp.lastScannedAt) return false;
    const today = new Date();
    const scanDate = new Date(cp.lastScannedAt);
    return scanDate.toDateString() === today.toDateString();
  }).length;

  const progress = checkpoints.length > 0 ? (scannedToday / checkpoints.length) * 100 : 0;

  return (
    <GuardMobileLayout title="Dashboard">
      <div className="space-y-4">
        {/* Welcome & Status */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            {profileLoading ? (
              <Skeleton className="h-16" />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Welcome, {profile?.fullName?.split(" ")[0] || "Guard"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {profile?.siteName || "No site assigned"}
                  </p>
                </div>
                <Badge
                  variant={activeShift ? "default" : "secondary"}
                  className="text-xs"
                >
                  {activeShift ? "On Duty" : "Off Duty"}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panic Button */}
        <PanicButton />

        {/* Check In/Out Card */}
        <CheckInOutCard />

        {/* Geofence Tracker */}
        <GeofenceTracker />

        {/* Next Checkpoint Alert */}
        {nextCheckpointTime !== null && (
          <Card
            className={`border ${
              alertActive
                ? "border-destructive bg-destructive/10 animate-pulse"
                : nextCheckpointTime <= 5
                ? "border-warning bg-warning/10"
                : "border-border"
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alertActive ? (
                    <Bell className="h-6 w-6 text-destructive animate-bounce" />
                  ) : (
                    <Clock className="h-6 w-6 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Next Checkpoint Due
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        alertActive
                          ? "text-destructive"
                          : nextCheckpointTime <= 5
                          ? "text-warning"
                          : "text-primary"
                      }`}
                    >
                      {nextCheckpointTime === 0
                        ? "Now!"
                        : `${nextCheckpointTime} min`}
                    </p>
                  </div>
                </div>
                <Link to="/guard/scan">
                  <Button size="sm" className="gap-2">
                    <ScanLine className="h-4 w-4" />
                    Scan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Today's Patrol Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {checkpointsLoading ? (
              <Skeleton className="h-12" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-foreground">
                    {scannedToday}/{checkpoints.length}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    checkpoints scanned
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/guard/scan">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ScanLine className="h-6 w-6 text-primary" />
                </div>
                <span className="font-medium text-sm">Scan QR</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/guard/incidents">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <span className="font-medium text-sm">Report Incident</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Handover Notes */}
        {unacknowledgedNotes.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-warning" />
                  Handover Notes
                </span>
                <Badge variant="outline" className="text-warning border-warning/50">
                  {unacknowledgedNotes.length} new
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unacknowledgedNotes.slice(0, 2).map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">
                        {note.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        From {note.guardName} •{" "}
                        {formatDistanceToNow(new Date(note.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        note.priority === "urgent"
                          ? "destructive"
                          : note.priority === "high"
                          ? "default"
                          : "secondary"
                      }
                      className="text-[10px] shrink-0"
                    >
                      {note.priority}
                    </Badge>
                  </div>
                </div>
              ))}
              <Link to="/guard/patrol">
                <Button variant="ghost" size="sm" className="w-full gap-1">
                  View all notes
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Checkpoints List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Your Checkpoints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checkpointsLoading ? (
              <>
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </>
            ) : checkpoints.length > 0 ? (
              checkpoints.slice(0, 4).map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {cp.sequenceOrder}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cp.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Every {cp.scanInterval} min
                        {cp.isRequired && " • Required"}
                      </p>
                    </div>
                  </div>
                  {cp.lastScannedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(cp.lastScannedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No checkpoints assigned
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </GuardMobileLayout>
  );
}
