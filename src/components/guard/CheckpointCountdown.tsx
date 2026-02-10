import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Timer, AlertTriangle, CheckCircle2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type CheckpointForScan } from "@/hooks/useGuardData";

interface CheckpointCountdownProps {
  checkpoints: CheckpointForScan[];
}

function createBeepSound(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playAlertBeep(audioCtx: AudioContext) {
  // Play 3 short beeps
  const playBeep = (startTime: number) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "square";
    gainNode.gain.value = 0.3;
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.15);
  };

  const now = audioCtx.currentTime;
  playBeep(now);
  playBeep(now + 0.25);
  playBeep(now + 0.5);
}

export function CheckpointCountdown({ checkpoints }: CheckpointCountdownProps) {
  const [now, setNow] = useState(Date.now());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = useCallback(() => {
    setSoundEnabled((prev) => {
      if (!prev && !audioCtxRef.current) {
        audioCtxRef.current = createBeepSound();
      }
      return !prev;
    });
  }, []);

  // Find next checkpoint that needs scanning
  const getNextCheckpoint = useCallback(() => {
    if (!checkpoints.length) return null;

    let nearest: {
      checkpoint: CheckpointForScan;
      dueAt: number;
      timeLeft: number;
      overdue: boolean;
    } | null = null;

    for (const cp of checkpoints) {
      if (!cp.isRequired) continue;

      const intervalMs = cp.scanInterval * 60 * 1000;
      let dueAt: number;

      if (cp.lastScannedAt) {
        dueAt = new Date(cp.lastScannedAt).getTime() + intervalMs;
      } else {
        // Never scanned — due now
        dueAt = now - 1000;
      }

      const timeLeft = dueAt - now;

      if (!nearest || (timeLeft > 0 && timeLeft < nearest.timeLeft) || (nearest.overdue && timeLeft > nearest.timeLeft)) {
        nearest = {
          checkpoint: cp,
          dueAt,
          timeLeft,
          overdue: timeLeft <= 0,
        };
      }
    }

    return nearest;
  }, [checkpoints, now]);

  const next = getNextCheckpoint();

  // Sound alert when checkpoint is due
  useEffect(() => {
    if (!next || !soundEnabled) return;

    const key = `${next.checkpoint.id}-${next.dueAt}`;

    if (next.timeLeft <= 0 && !alertedRef.current.has(key)) {
      alertedRef.current.add(key);
      if (!audioCtxRef.current) {
        audioCtxRef.current = createBeepSound();
      }
      if (audioCtxRef.current) {
        playAlertBeep(audioCtxRef.current);
      }
    }

    // Also alert at 1 minute warning
    const warningKey = `warn-${next.checkpoint.id}-${next.dueAt}`;
    if (next.timeLeft > 0 && next.timeLeft <= 60000 && !alertedRef.current.has(warningKey)) {
      alertedRef.current.add(warningKey);
      if (!audioCtxRef.current) {
        audioCtxRef.current = createBeepSound();
      }
      if (audioCtxRef.current) {
        playAlertBeep(audioCtxRef.current);
      }
    }
  }, [next, soundEnabled]);

  if (!next) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <div>
            <p className="font-medium text-success">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending checkpoints</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.abs(Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const intervalMs = next.checkpoint.scanInterval * 60 * 1000;
  const elapsed = intervalMs - next.timeLeft;
  const progress = next.overdue ? 100 : Math.min(100, (elapsed / intervalMs) * 100);
  const isUrgent = next.timeLeft <= 120000 && !next.overdue; // 2 minutes

  return (
    <Card
      className={
        next.overdue
          ? "border-destructive/50 bg-destructive/5 animate-pulse"
          : isUrgent
          ? "border-warning/50 bg-warning/5"
          : "border-primary/30 bg-primary/5"
      }
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {next.overdue ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Timer className="h-5 w-5 text-primary" />
            )}
            <span className="font-semibold text-sm">
              {next.overdue ? "OVERDUE" : "Next Checkpoint"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSoundToggle}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Badge
              variant={next.overdue ? "destructive" : isUrgent ? "default" : "secondary"}
            >
              {next.overdue ? `Overdue by ${formatTime(next.timeLeft)}` : formatTime(next.timeLeft)}
            </Badge>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">
              {next.checkpoint.name}
            </span>
            <span className="text-xs text-muted-foreground">
              Every {next.checkpoint.scanInterval}min
            </span>
          </div>
          <Progress
            value={progress}
            className={`h-2 ${
              next.overdue
                ? "[&>div]:bg-destructive"
                : isUrgent
                ? "[&>div]:bg-warning"
                : ""
            }`}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {next.checkpoint.siteName} • Checkpoint #{next.checkpoint.sequenceOrder}
        </p>
      </CardContent>
    </Card>
  );
}
