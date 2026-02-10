import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTriggerPanic } from "@/hooks/usePanicButton";
import { AlertTriangle, Loader2, MapPin } from "lucide-react";

export function PanicButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const triggerPanic = useTriggerPanic();

  const getLocation = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setIsGettingLocation(false);
        },
        () => {
          setIsGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      getLocation();
    }
  }, [isDialogOpen]);

  const handleTrigger = () => {
    triggerPanic.mutate(
      {
        latitude: location?.latitude,
        longitude: location?.longitude,
        message: message || undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          setMessage("");
        },
      }
    );
  };

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        className="w-full h-16 text-lg font-bold gap-3 animate-pulse hover:animate-none bg-destructive hover:bg-destructive/90 shadow-lg"
        onClick={() => setIsDialogOpen(true)}
      >
        <AlertTriangle className="h-6 w-6" />
        EMERGENCY / PANIC
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent className="border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Trigger Emergency Alert?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This will immediately notify all supervisors and administrators
                with your location. Use only in genuine emergencies.
              </p>

              <div className="flex items-center gap-2 text-sm">
                {isGettingLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Getting location...</span>
                  </>
                ) : location ? (
                  <>
                    <MapPin className="h-4 w-4 text-success" />
                    <span className="text-success">Location captured</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>Location not available</span>
                  </>
                )}
              </div>

              <Textarea
                placeholder="Optional: Describe the emergency..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTrigger}
              disabled={triggerPanic.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {triggerPanic.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Send Emergency Alert"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
