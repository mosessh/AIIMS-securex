import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AlertItem } from "@/components/dashboard/AlertsPanel";
import { useAlerts, useAcknowledgeAlert } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AlertSeverity } from "@/types/guard-tour";

type SeverityFilter = AlertSeverity | "all";

const Alerts = () => {
  const { data: alerts = [], isLoading } = useAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
      const matchesSearch = 
        alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.guardName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesSeverity && matchesSearch;
    });
  }, [alerts, severityFilter, searchQuery]);

  const severityCounts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low: alerts.filter(a => a.severity === "low").length,
  }), [alerts]);

  const unresolvedCount = alerts.filter(a => !a.acknowledged).length;

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
      toast({
        title: "Alert acknowledged",
        description: "The alert has been marked as acknowledged.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge alert. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAcknowledgeAll = async () => {
    const unacknowledged = filteredAlerts.filter(a => !a.acknowledged);
    try {
      await Promise.all(unacknowledged.map(a => acknowledgeAlert(a.id)));
      toast({
        title: "All alerts acknowledged",
        description: `${unacknowledged.length} alerts marked as acknowledged.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to acknowledge some alerts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const unacknowledgedInView = filteredAlerts.filter(a => !a.acknowledged).length;

  return (
    <AppLayout 
      title="Alerts & Notifications" 
      subtitle={`${unresolvedCount} unresolved alerts`}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="success" 
            size="sm"
            disabled={unacknowledgedInView === 0}
            onClick={handleAcknowledgeAll}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Acknowledge All ({unacknowledgedInView})
          </Button>
        </div>
      </div>

      {/* Severity Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge 
          variant={severityFilter === "all" ? "secondary" : "outline"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSeverityFilter("all")}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          All ({severityCounts.all})
        </Badge>
        <Badge 
          variant={severityFilter === "critical" ? "alert" : "outline"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSeverityFilter("critical")}
        >
          Critical ({severityCounts.critical})
        </Badge>
        <Badge 
          variant={severityFilter === "high" ? "warning" : "outline"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSeverityFilter("high")}
        >
          High ({severityCounts.high})
        </Badge>
        <Badge 
          variant={severityFilter === "medium" ? "secondary" : "outline"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSeverityFilter("medium")}
        >
          Medium ({severityCounts.medium})
        </Badge>
        <Badge 
          variant={severityFilter === "low" ? "secondary" : "outline"} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setSeverityFilter("low")}
        >
          Low ({severityCounts.low})
        </Badge>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2 text-success/50" />
            <p>{searchQuery || severityFilter !== "all" 
              ? "No alerts match your filters" 
              : "All clear - no alerts"}</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Alerts;
