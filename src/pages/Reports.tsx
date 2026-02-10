import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports, useCreateReport, Report } from "@/hooks/useReports";
import { useSites } from "@/hooks/useSites";
import { 
  FileText, 
  Download, 
  Calendar,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reportTypeConfig = {
  patrol: { icon: MapPin, color: 'text-primary', bgColor: 'bg-primary/10' },
  incident: { icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  attendance: { icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
  compliance: { icon: CheckCircle2, color: 'text-warning', bgColor: 'bg-warning/10' },
};

function ReportCard({ report }: { report: Report }) {
  const config = reportTypeConfig[report.type];
  const Icon = config.icon;
  
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${config.bgColor}`}>
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{report.title}</h4>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{report.siteName}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(report.createdAt), 'MMM d, yyyy')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={report.status === 'ready' ? 'success' : 'secondary'}>
            {report.status}
          </Badge>
          <Button variant="outline" size="sm" disabled={report.status !== 'ready'}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateReportDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Report['type']>('patrol');
  const [siteId, setSiteId] = useState<string>("");
  
  const { data: sites = [] } = useSites();
  const createMutation = useCreateReport();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      title,
      type,
      siteId: siteId || undefined,
    });
    setOpen(false);
    setTitle("");
    setType('patrol');
    setSiteId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate New Report</DialogTitle>
          <DialogDescription>
            Create a new report for your records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                placeholder="Daily Patrol Summary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Report Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Report['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patrol">Patrol</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="incident">Incident</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">Site (Optional)</Label>
              <Select value={siteId} onValueChange={setSiteId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const Reports = () => {
  const { data: reports = [], isLoading } = useReports();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    if (!typeFilter) return reports;
    return reports.filter((r) => r.type === typeFilter);
  }, [reports, typeFilter]);

  const typeCounts = useMemo(() => ({
    all: reports.length,
    patrol: reports.filter((r) => r.type === 'patrol').length,
    attendance: reports.filter((r) => r.type === 'attendance').length,
    incident: reports.filter((r) => r.type === 'incident').length,
    compliance: reports.filter((r) => r.type === 'compliance').length,
  }), [reports]);

  return (
    <AppLayout 
      title="Reports" 
      subtitle="Generate and download patrol reports"
    >
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Daily Summary', icon: Clock, desc: 'Today\'s patrol summary', type: 'patrol' as const },
          { label: 'Attendance Report', icon: Users, desc: 'Staff attendance data', type: 'attendance' as const },
          { label: 'Incident Report', icon: AlertTriangle, desc: 'Log new incidents', type: 'incident' as const },
          { label: 'Compliance Report', icon: CheckCircle2, desc: 'Site compliance metrics', type: 'compliance' as const },
        ].map((action) => (
          <div 
            key={action.label}
            className="rounded-xl border border-border bg-card p-4 shadow-card cursor-pointer transition-all duration-300 hover:border-primary/30 hover:bg-card/80"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reports Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Recent Reports</h3>
          <p className="text-sm text-muted-foreground">Previously generated reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <CreateReportDialog />
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge 
          variant={typeFilter === null ? 'active' : 'secondary'} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setTypeFilter(null)}
        >
          All Reports ({typeCounts.all})
        </Badge>
        <Badge 
          variant={typeFilter === 'patrol' ? 'active' : 'secondary'} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setTypeFilter('patrol')}
        >
          <MapPin className="h-3 w-3 mr-1" />
          Patrol ({typeCounts.patrol})
        </Badge>
        <Badge 
          variant={typeFilter === 'attendance' ? 'active' : 'secondary'} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setTypeFilter('attendance')}
        >
          <Users className="h-3 w-3 mr-1" />
          Attendance ({typeCounts.attendance})
        </Badge>
        <Badge 
          variant={typeFilter === 'incident' ? 'active' : 'secondary'} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setTypeFilter('incident')}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Incidents ({typeCounts.incident})
        </Badge>
        <Badge 
          variant={typeFilter === 'compliance' ? 'active' : 'secondary'} 
          className="cursor-pointer px-4 py-2"
          onClick={() => setTypeFilter('compliance')}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Compliance ({typeCounts.compliance})
        </Badge>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports found</p>
            <p className="text-sm">Generate a new report to get started</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
