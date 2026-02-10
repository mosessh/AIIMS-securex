import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { ActiveGuardsList } from "@/components/dashboard/GuardCard";
import { ActivePatrols } from "@/components/dashboard/ActivePatrols";
import { SiteCard } from "@/components/dashboard/SiteCard";
import { LivePatrolStatus } from "@/components/dashboard/LivePatrolStatus";
import { UpcomingShiftsWidget } from "@/components/dashboard/UpcomingShiftsWidget";
import { PanicAlertsWidget } from "@/components/dashboard/PanicAlertsWidget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useAlerts, useAcknowledgeAlert } from "@/hooks/useAlerts";
import { useGuards } from "@/hooks/useGuards";
import { useShifts } from "@/hooks/useShifts";
import { useSites } from "@/hooks/useSites";
import { usePatrolLogs } from "@/hooks/usePatrolLogs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  MapPin,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Shield,
} from "lucide-react";

const Index = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: guards = [], isLoading: guardsLoading } = useGuards();
  const { data: shifts = [], isLoading: shiftsLoading } = useShifts();
  const { data: sites = [], isLoading: sitesLoading } = useSites();
  const acknowledgeAlert = useAcknowledgeAlert();

  // Enable real-time updates for patrol logs
  usePatrolLogs();

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await acknowledgeAlert(id);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  return (
    <AppLayout 
      title="Command Center" 
      subtitle="Real-time monitoring and control"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatCard
              title="Active Guards"
              value={`${stats?.activeGuards ?? 0}/${stats?.totalGuards ?? 0}`}
              subtitle="Currently on duty"
              icon={Users}
              variant="success"
              trend={{ value: 5, isPositive: true }}
            />
            <StatCard
              title="Active Patrols"
              value={stats?.activePatrols ?? 0}
              subtitle="Patrols in progress"
              icon={MapPin}
              variant="default"
            />
            <StatCard
              title="Sites Monitored"
              value={stats?.sitesMonitored ?? 0}
              subtitle="All sites active"
              icon={Building2}
              variant="default"
            />
            <StatCard
              title="Alerts Today"
              value={stats?.alertsToday ?? 0}
              subtitle="Requires attention"
              icon={AlertTriangle}
              variant={(stats?.alertsToday ?? 0) > 0 ? 'alert' : 'success'}
            />
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              title="Compliance Rate"
              value={`${stats?.complianceRate ?? 0}%`}
              icon={TrendingUp}
              variant="success"
              trend={{ value: 2.3, isPositive: true }}
            />
            <StatCard
              title="Checkpoints Scanned"
              value={stats?.checkpointsScanned ?? 0}
              subtitle="Today"
              icon={CheckCircle2}
              variant="default"
            />
            <StatCard
              title="Incidents Today"
              value={stats?.incidentsToday ?? 0}
              icon={Shield}
              variant={(stats?.incidentsToday ?? 0) > 0 ? 'warning' : 'success'}
            />
            <StatCard
              title="Avg Response Time"
              value="2.4 min"
              subtitle="Alert acknowledgment"
              icon={Clock}
              variant="default"
            />
          </>
        )}
      </div>

      {/* Panic Alerts Widget - Full Width when active */}
      <div className="mb-6">
        <PanicAlertsWidget />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Alerts Panel - Takes 2 columns */}
        <div className="lg:col-span-2">
          {alertsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledgeAlert} />
          )}
        </div>

        {/* Active Guards */}
        <div>
          {guardsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ActiveGuardsList guards={guards} />
          )}
        </div>
      </div>

      {/* Active Patrols, Live Status & Upcoming Shifts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Active Patrols */}
        <div>
          {shiftsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <ActivePatrols shifts={shifts} />
          )}
        </div>

        {/* Live Patrol Status */}
        <div>
          <LivePatrolStatus />
        </div>

        {/* Upcoming Shifts Widget */}
        <div>
          <UpcomingShiftsWidget />
        </div>
      </div>

      {/* Sites Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Sites Overview</h3>
                <p className="text-sm text-muted-foreground">
                  {sites.length} sites monitored
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sitesLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : sites.length > 0 ? (
              sites.slice(0, 6).map((site) => (
                <SiteCard key={site.id} site={site} />
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8 col-span-3">No sites configured</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
