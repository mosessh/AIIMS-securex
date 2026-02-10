import { Badge } from "@/components/ui/badge";
import { Alert } from "@/types/guard-tour";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  Clock, 
  Moon, 
  MapPin, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AlertItemProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

const alertIcons = {
  missed_checkpoint: MapPin,
  late_attendance: Clock,
  sleep_detected: Moon,
  camera_no_activity: AlertCircle,
  panic_button: AlertTriangle,
  unauthorized_area: AlertTriangle,
};

const severityColors = {
  low: 'border-l-muted-foreground',
  medium: 'border-l-warning',
  high: 'border-l-warning',
  critical: 'border-l-destructive',
};

export function AlertItem({ alert, onAcknowledge }: AlertItemProps) {
  const Icon = alertIcons[alert.type];
  
  return (
    <div
      className={cn(
        "relative flex items-start gap-4 rounded-lg border border-border bg-card/50 p-4 transition-all duration-200 hover:bg-card border-l-4",
        severityColors[alert.severity],
        alert.acknowledged && "opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          alert.severity === 'critical' ? "bg-destructive/20" : 
          alert.severity === 'high' ? "bg-warning/20" : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            alert.severity === 'critical' ? "text-destructive" :
            alert.severity === 'high' ? "text-warning" : "text-muted-foreground"
          )}
        />
      </div>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{alert.message}</p>
          {alert.severity === 'critical' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{alert.siteName}</span>
          <span>•</span>
          <span>{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</span>
        </div>
        
        {alert.acknowledged ? (
          <div className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>Acknowledged by {alert.acknowledgedBy}</span>
          </div>
        ) : (
          <button
            onClick={() => onAcknowledge?.(alert.id)}
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Acknowledge
          </button>
        )}
      </div>
      
      <Badge
        variant={
          alert.severity === 'critical' ? 'alert' :
          alert.severity === 'high' ? 'warning' : 'secondary'
        }
      >
        {alert.severity}
      </Badge>
    </div>
  );
}

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge?: (id: string) => void;
}

export function AlertsPanel({ alerts, onAcknowledge }: AlertsPanelProps) {
  const unresolvedAlerts = alerts.filter(a => !a.acknowledged);
  
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Active Alerts</h3>
            <p className="text-sm text-muted-foreground">
              {unresolvedAlerts.length} unresolved
            </p>
          </div>
        </div>
        {unresolvedAlerts.length > 0 && (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
        )}
      </div>
      
      <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2 text-success/50" />
            <p>All clear - no active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onAcknowledge={onAcknowledge} />
          ))
        )}
      </div>
    </div>
  );
}
