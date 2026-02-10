import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Guard } from "@/types/guard-tour";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { User, MapPin, Star, Clock, Pencil } from "lucide-react";

interface GuardCardProps {
  guard: Guard;
  compact?: boolean;
  onEdit?: (guard: Guard) => void;
}

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const },
  on_patrol: { label: 'On Patrol', variant: 'active' as const },
  off_duty: { label: 'Off Duty', variant: 'inactive' as const },
  suspended: { label: 'Suspended', variant: 'alert' as const },
};

export function GuardCard({ guard, compact = false, onEdit }: GuardCardProps) {
  const status = statusConfig[guard.status];
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3 transition-all duration-200 hover:bg-card hover:border-primary/30">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
              guard.status === 'on_patrol' || guard.status === 'active'
                ? "bg-success"
                : "bg-muted-foreground"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{guard.name}</p>
          <p className="text-xs text-muted-foreground truncate">{guard.siteName}</p>
        </div>
        <Badge variant={status.variant} className="shrink-0">
          {status.label}
        </Badge>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <span
            className={cn(
              "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card",
              guard.status === 'on_patrol' || guard.status === 'active'
                ? "bg-success"
                : "bg-muted-foreground"
            )}
          />
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-foreground">{guard.name}</h4>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(guard)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">{guard.role}</p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{guard.siteName || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-warning" />
              <span>{guard.rating.toFixed(1)}</span>
            </div>
          </div>
          
          {guard.lastCheckIn && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
              <Clock className="h-3 w-3" />
              <span>Last check-in {formatDistanceToNow(guard.lastCheckIn, { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Attendance Rate</p>
          <p className="text-lg font-semibold text-foreground">{guard.attendanceRate}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Rating</p>
          <div className="flex items-center gap-1">
            <p className="text-lg font-semibold text-foreground">{guard.rating.toFixed(1)}</p>
            <Star className="h-4 w-4 text-warning fill-warning" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ActiveGuardsListProps {
  guards: Guard[];
}

export function ActiveGuardsList({ guards }: ActiveGuardsListProps) {
  const activeGuards = guards.filter(g => g.status === 'on_patrol' || g.status === 'active');
  
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <User className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Active Guards</h3>
            <p className="text-sm text-muted-foreground">
              {activeGuards.length} currently on duty
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
        {activeGuards.map((guard) => (
          <GuardCard key={guard.id} guard={guard} compact />
        ))}
      </div>
    </div>
  );
}
