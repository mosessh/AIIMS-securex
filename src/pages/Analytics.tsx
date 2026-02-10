import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MapPin, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  Star,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  useGuardPerformance, 
  useWeeklyTrends, 
  useDailyPatrolData, 
  useAlertsByType,
  type GuardPerformance 
} from "@/hooks/useGuardAnalytics";
import { useExportReports } from "@/hooks/useExportReports";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--success))'];

const statusConfig = {
  active: { label: 'Active', variant: 'success' as const },
  on_patrol: { label: 'On Patrol', variant: 'active' as const },
  off_duty: { label: 'Off Duty', variant: 'inactive' as const },
  suspended: { label: 'Suspended', variant: 'alert' as const },
};

function StatBox({ 
  title, 
  value, 
  change, 
  icon: Icon,
  isPositive,
  isLoading
}: { 
  title: string; 
  value: string; 
  change?: string;
  icon: any;
  isPositive?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-32 rounded-xl" />;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      {change && (
        <div className="flex items-center gap-1 mt-3">
          {isPositive !== undefined && (
            isPositive ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )
          )}
          <span className={cn(
            "text-sm",
            isPositive ? "text-success" : isPositive === false ? "text-destructive" : "text-muted-foreground"
          )}>
            {change}
          </span>
          {isPositive !== undefined && (
            <span className="text-muted-foreground text-sm">vs last period</span>
          )}
        </div>
      )}
    </div>
  );
}

function GuardPerformanceRow({ 
  guard, 
  rank,
  expanded,
  onToggle
}: { 
  guard: GuardPerformance; 
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = statusConfig[guard.status as keyof typeof statusConfig] || statusConfig.off_duty;

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-secondary/50"
        onClick={onToggle}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
              rank <= 3 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
            )}>
              {rank}
            </div>
            <div>
              <p className="font-medium text-foreground">{guard.name}</p>
              <p className="text-xs text-muted-foreground">{guard.siteName}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={status.variant}>{status.label}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={guard.complianceRate} className="w-20 h-2" />
            <span className={cn(
              "font-medium",
              guard.complianceRate >= 90 ? "text-success" : 
              guard.complianceRate >= 70 ? "text-warning" : "text-destructive"
            )}>
              {guard.complianceRate}%
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className="font-medium">{guard.attendanceRate}%</span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-warning fill-warning" />
            <span className="font-medium">{guard.rating.toFixed(1)}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className="font-medium">{guard.totalPatrols}</span>
        </TableCell>
        <TableCell>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-secondary/30">
          <TableCell colSpan={7}>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">On-Time Scans</p>
                <p className="text-lg font-semibold text-success">{guard.onTimeScans}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Late Scans</p>
                <p className="text-lg font-semibold text-warning">{guard.lateScans}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incidents Reported</p>
                <p className="text-lg font-semibold text-foreground">{guard.incidentsReported}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shifts Completed</p>
                <p className="text-lg font-semibold text-foreground">
                  {guard.shiftsCompleted}/{guard.shiftsTotal}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const Analytics = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"compliance" | "attendance" | "rating" | "patrols">("compliance");
  const [expandedGuard, setExpandedGuard] = useState<string | null>(null);

  const { data: guards = [], isLoading: guardsLoading } = useGuardPerformance();
  const { data: weeklyTrends = [], isLoading: trendsLoading } = useWeeklyTrends();
  const { data: dailyPatrols = [], isLoading: patrolsLoading } = useDailyPatrolData();
  const { data: alertsByType = [], isLoading: alertsLoading } = useAlertsByType();
  const { exportToPDF, exportToExcel } = useExportReports();

  // Calculate summary stats
  const avgCompliance = guards.length > 0
    ? Math.round(guards.reduce((sum, g) => sum + g.complianceRate, 0) / guards.length * 10) / 10
    : 0;
  const avgAttendance = guards.length > 0
    ? Math.round(guards.reduce((sum, g) => sum + g.attendanceRate, 0) / guards.length * 10) / 10
    : 0;
  const totalPatrols = guards.reduce((sum, g) => sum + g.totalPatrols, 0);
  const activeGuards = guards.filter(g => g.status === "active" || g.status === "on_patrol").length;

  // Filter and sort guards
  const filteredGuards = guards
    .filter(g => 
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.siteName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "compliance": return b.complianceRate - a.complianceRate;
        case "attendance": return b.attendanceRate - a.attendanceRate;
        case "rating": return b.rating - a.rating;
        case "patrols": return b.totalPatrols - a.totalPatrols;
        default: return 0;
      }
    });

  const handleExportPDF = () => {
    const exportData = {
      guards: guards.map(g => ({
        name: g.name,
        compliance: g.complianceRate,
        shiftsCompleted: g.shiftsCompleted,
        totalShifts: g.shiftsTotal,
        avgRating: g.rating,
        attendanceRate: g.attendanceRate,
      })),
      reportType: 'performance' as const,
    };
    exportToPDF.mutate(exportData);
  };

  const handleExportExcel = () => {
    const exportData = {
      guards: guards.map(g => ({
        name: g.name,
        compliance: g.complianceRate,
        shiftsCompleted: g.shiftsCompleted,
        totalShifts: g.shiftsTotal,
        avgRating: g.rating,
        attendanceRate: g.attendanceRate,
      })),
      reportType: 'performance' as const,
    };
    exportToExcel.mutate(exportData);
  };

  return (
    <AppLayout 
      title="Guard Performance Analytics" 
      subtitle="Individual metrics, attendance trends, and patrol compliance"
      actions={
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            disabled={exportToPDF.isPending || guards.length === 0}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {exportToPDF.isPending ? "Exporting..." : "Export PDF"}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={exportToExcel.isPending || guards.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exportToExcel.isPending ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      }
    >
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatBox
          title="Total Patrols (30 days)"
          value={totalPatrols.toString()}
          icon={MapPin}
          isLoading={guardsLoading}
        />
        <StatBox
          title="Avg Compliance"
          value={`${avgCompliance}%`}
          change={avgCompliance >= 90 ? "Excellent" : avgCompliance >= 70 ? "Good" : "Needs improvement"}
          icon={CheckCircle2}
          isPositive={avgCompliance >= 90}
          isLoading={guardsLoading}
        />
        <StatBox
          title="Avg Attendance"
          value={`${avgAttendance}%`}
          icon={Users}
          isPositive={avgAttendance >= 95}
          isLoading={guardsLoading}
        />
        <StatBox
          title="Active Guards"
          value={`${activeGuards}/${guards.length}`}
          icon={Clock}
          isLoading={guardsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Compliance Trend */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Compliance Trend</h3>
              <p className="text-sm text-muted-foreground">Last 4 weeks</p>
            </div>
          </div>
          {trendsLoading ? (
            <Skeleton className="h-[250px]" />
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" className="text-muted-foreground" fontSize={12} />
                  <YAxis domain={[0, 100]} className="text-muted-foreground" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Compliance']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="complianceRate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Daily Patrol Completion */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Daily Patrol Completion</h3>
              <p className="text-sm text-muted-foreground">This week</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">On Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Late</span>
              </div>
            </div>
          </div>
          {patrolsLoading ? (
            <Skeleton className="h-[250px]" />
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPatrols}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-muted-foreground" fontSize={12} />
                  <YAxis className="text-muted-foreground" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="On Time" />
                  <Bar dataKey="missed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Alerts Distribution & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Alerts by Type */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground">Alerts by Type</h3>
            <p className="text-sm text-muted-foreground">Last 30 days</p>
          </div>
          {alertsLoading ? (
            <Skeleton className="h-[250px]" />
          ) : alertsByType.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {alertsByType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {alertsByType.slice(0, 4).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-muted-foreground truncate">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No alerts in this period
            </div>
          )}
        </div>

        {/* Top Performers Quick View */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Top Performers</h3>
              <p className="text-sm text-muted-foreground">Based on compliance score</p>
            </div>
          </div>
          {guardsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuards.slice(0, 4).map((guard, index) => (
                <div key={guard.id} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full font-bold",
                    index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                    index === 1 ? "bg-gray-400/20 text-gray-400" :
                    index === 2 ? "bg-orange-600/20 text-orange-600" :
                    "bg-primary/20 text-primary"
                  )}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{guard.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Attendance: {guard.attendanceRate}%</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-warning fill-warning" />
                        {guard.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{guard.complianceRate}%</p>
                    <p className="text-xs text-muted-foreground">Compliance</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guard Performance Table */}
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">All Guards Performance</h3>
            <p className="text-sm text-muted-foreground">
              {filteredGuards.length} guard{filteredGuards.length !== 1 ? "s" : ""} • Last 30 days
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="patrols">Total Patrols</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {guardsLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guard</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right">Patrols</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No guards found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuards.map((guard, index) => (
                    <GuardPerformanceRow
                      key={guard.id}
                      guard={guard}
                      rank={index + 1}
                      expanded={expandedGuard === guard.id}
                      onToggle={() => setExpandedGuard(expandedGuard === guard.id ? null : guard.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Analytics;
