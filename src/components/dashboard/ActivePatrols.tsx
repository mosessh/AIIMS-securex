import { Shift } from "@/types/guard-tour";
import { format } from "date-fns";
import { Clock, MapPin, CheckCircle2, Pencil, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ShiftCardProps {
  shift: Shift;
  onEdit?: (shift: Shift) => void;
  onCancel?: (shift: Shift) => void;
}

export function ShiftCard({ shift, onEdit, onCancel }: ShiftCardProps) {
  const progress = shift.totalCheckpoints > 0 
    ? (shift.checkpointsCompleted / shift.totalCheckpoints) * 100 
    : 0;
  
  const canModify = shift.status === "scheduled";
  
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 transition-all duration-200 hover:bg-card hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{shift.guardName}</h4>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{shift.siteName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {canModify && onEdit && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(shift);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {canModify && onCancel && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(shift);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <Badge 
            variant={
              shift.status === 'active' ? 'active' : 
              shift.status === 'completed' ? 'inactive' :
              shift.status === 'missed' ? 'alert' : 
              'secondary'
            }
          >
            {shift.status}
          </Badge>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(shift.startTime, 'HH:mm')} - {format(shift.endTime, 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{shift.checkpointsCompleted}/{shift.totalCheckpoints}</span>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <p className="text-xs text-muted-foreground text-right">
          {Math.round(progress)}% complete
        </p>
      </div>
    </div>
  );
}

interface ActivePatrolsProps {
  shifts: Shift[];
}

export function ActivePatrols({ shifts }: ActivePatrolsProps) {
  const activeShifts = shifts.filter(s => s.status === 'active');
  
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Active Patrols</h3>
            <p className="text-sm text-muted-foreground">
              {activeShifts.length} patrols in progress
            </p>
          </div>
        </div>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
        {activeShifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} />
        ))}
      </div>
    </div>
  );
}
