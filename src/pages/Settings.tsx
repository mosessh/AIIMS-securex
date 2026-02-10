import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemSettings, useUpdateSetting, useUploadSettingsImage } from "@/hooks/useSystemSettings";
import { useSystemLogs, useApiConfigurations } from "@/hooks/useSystemLogs";
import { format } from "date-fns";
import { 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Mail,
  Smartphone,
  Clock,
  Eye,
  Lock,
  Globe,
  ChevronRight,
  Upload,
  Image,
  Loader2,
  Activity,
  Key,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  FileText,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiConfigDialog } from "@/components/settings/ApiConfigDialog";

interface SettingCardProps {
  icon: any;
  title: string;
  description: string;
  children?: React.ReactNode;
  isLoading?: boolean;
}

function SettingCard({ icon: Icon, title, description, children, isLoading }: SettingCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            children && <div className="mt-4">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ 
  label, 
  description, 
  enabled = true,
  onToggle
}: { 
  label: string; 
  description?: string;
  enabled?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

const Settings = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useSystemLogs(7);
  const { data: apiConfigs = [], isLoading: apisLoading, refetch: refetchApis } = useApiConfigurations();
  const updateSetting = useUpdateSetting();
  const uploadImage = useUploadSettingsImage();
  
  const [companyName, setCompanyName] = useState("");
  const [qrInterval, setQrInterval] = useState(15);
  const [gracePeriod, setGracePeriod] = useState(5);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [apiDialogType, setApiDialogType] = useState<"sms" | "email" | "push" | "ai" | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Initialize form values when settings load
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName);
      setQrInterval(settings.qrScanInterval);
      setGracePeriod(settings.gracePeriod);
      setLogoPreview(settings.logoUrl);
      setFaviconPreview(settings.faviconUrl);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);

    const url = await uploadImage.mutateAsync({ file, type: 'logo' });
    await updateSetting.mutateAsync({ key: 'logo_url', value: url });
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setFaviconPreview(reader.result as string);
    reader.readAsDataURL(file);

    const url = await uploadImage.mutateAsync({ file, type: 'favicon' });
    await updateSetting.mutateAsync({ key: 'favicon_url', value: url });
    
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'icon';
    link.href = url;
    document.head.appendChild(link);
  };

  const handleSave = async () => {
    await Promise.all([
      updateSetting.mutateAsync({ key: 'company_name', value: companyName }),
      updateSetting.mutateAsync({ key: 'qr_scan_interval', value: String(qrInterval) }),
      updateSetting.mutateAsync({ key: 'grace_period', value: String(gracePeriod) }),
    ]);
  };

  const isSaving = updateSetting.isPending || uploadImage.isPending;

  const getLogIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-warning" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getLogTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      auth: 'default',
      patrol: 'success',
      alert: 'destructive',
      system: 'secondary',
      api: 'outline',
    };
    return <Badge variant={variants[type] || 'secondary'}>{type}</Badge>;
  };

  return (
    <AppLayout 
      title="Settings" 
      subtitle="Configure your system preferences"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Config</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branding Settings */}
            <SettingCard
              icon={Image}
              title="Branding"
              description="Customize logo and favicon"
              isLoading={isLoading}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Company Name</label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Guard Tour System"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">System Logo</label>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="h-16 w-16 object-contain rounded-lg border border-border bg-muted"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      {uploadImage.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Logo
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Favicon</label>
                  <input
                    type="file"
                    ref={faviconInputRef}
                    accept="image/*"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    {faviconPreview ? (
                      <img 
                        src={faviconPreview} 
                        alt="Favicon preview" 
                        className="h-10 w-10 object-contain rounded border border-border bg-muted"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded border border-dashed border-border bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={isSaving}
                    >
                      {uploadImage.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Upload Favicon
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 32x32 or 64x64 pixels
                  </p>
                </div>
              </div>
            </SettingCard>

            {/* Notification Settings */}
            <SettingCard
              icon={Bell}
              title="Notification Settings"
              description="Configure how and when you receive alerts"
              isLoading={isLoading}
            >
              <div className="space-y-1">
                <SettingRow 
                  label="Email Notifications" 
                  description="Receive alerts via email"
                  enabled={true}
                />
                <SettingRow 
                  label="SMS Notifications" 
                  description="Critical alerts via SMS"
                  enabled={true}
                />
                <SettingRow 
                  label="Push Notifications" 
                  description="Real-time in-app alerts"
                  enabled={true}
                />
                <SettingRow 
                  label="Sound Alerts" 
                  description="Play sound for critical alerts"
                  enabled={false}
                />
              </div>
            </SettingCard>

            {/* AI Camera Settings */}
            <SettingCard
              icon={Eye}
              title="AI Camera Settings"
              description="Configure AI detection parameters"
              isLoading={isLoading}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Sensitivity Level</label>
                  <div className="flex gap-2 mt-2">
                    {['Low', 'Medium', 'High'].map((level) => (
                      <Badge 
                        key={level}
                        variant={level === 'Medium' ? 'default' : 'secondary'}
                        className="cursor-pointer px-4 py-1"
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>
                <SettingRow 
                  label="Sleep Detection" 
                  description="Detect guard sleeping patterns"
                  enabled={true}
                />
                <SettingRow 
                  label="Zone Monitoring" 
                  description="Track presence in designated zones"
                  enabled={true}
                />
              </div>
            </SettingCard>

            {/* Patrol Settings */}
            <SettingCard
              icon={Clock}
              title="Patrol Settings"
              description="Configure patrol and checkpoint rules"
              isLoading={isLoading}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">QR Scan Interval</label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      type="number" 
                      value={qrInterval}
                      onChange={(e) => setQrInterval(parseInt(e.target.value) || 15)}
                      className="w-24 bg-secondary" 
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Grace Period</label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      type="number" 
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(parseInt(e.target.value) || 5)}
                      className="w-24 bg-secondary" 
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
                <SettingRow 
                  label="Enforce Checkpoint Sequence" 
                  description="Guards must scan in order"
                  enabled={false}
                />
              </div>
            </SettingCard>

            {/* Security Settings */}
            <SettingCard
              icon={Lock}
              title="Security Settings"
              description="Account and access settings"
              isLoading={isLoading}
            >
              <div className="space-y-1">
                <SettingRow 
                  label="Two-Factor Authentication" 
                  description="Additional security layer"
                  enabled={true}
                />
                <SettingRow 
                  label="Session Timeout" 
                  description="Auto logout after inactivity"
                  enabled={true}
                />
                <SettingRow 
                  label="Login Alerts" 
                  description="Notify on new device login"
                  enabled={true}
                />
              </div>
            </SettingCard>

            {/* System Info */}
            <SettingCard
              icon={Database}
              title="System Information"
              description="Version and license details"
              isLoading={isLoading}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="text-sm font-medium text-foreground">v2.4.1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">License</span>
                  <Badge variant="success">Enterprise</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium text-foreground">Jan 14, 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Support</span>
                  <span className="text-sm text-primary cursor-pointer hover:underline">Contact Support</span>
                </div>
              </div>
            </SettingCard>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </TabsContent>

        {/* API Configuration Tab */}
        <TabsContent value="api" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">API Integrations</h3>
                  <p className="text-sm text-muted-foreground">Manage external service connections</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => refetchApis()} disabled={apisLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", apisLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {apisLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : (
              <div className="space-y-3">
                {apiConfigs.map((api) => (
                  <div 
                    key={api.key} 
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        api.status === 'connected' ? "bg-success/10" : "bg-muted"
                      )}>
                        <Server className={cn(
                          "h-5 w-5",
                          api.status === 'connected' ? "text-success" : "text-muted-foreground"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{api.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last checked: {api.lastChecked ? format(new Date(api.lastChecked), 'MMM d, HH:mm') : 'Never'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={api.status === 'connected' ? 'success' : 'inactive'}>
                        {api.status === 'connected' ? 'Connected' : 'Not Connected'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const typeMap: Record<string, "sms" | "email" | "push" | "ai"> = {
                            twilio_sid: "sms",
                            smtp_host: "email",
                            onesignal_app_id: "push",
                            ai_vision_endpoint: "ai",
                          };
                          setApiDialogType(typeMap[api.key] || "sms");
                          setApiDialogOpen(true);
                        }}
                      >
                        Configure
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="font-medium text-foreground mb-2">Add New Integration</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Connect additional services like Twilio, SendGrid, or custom webhooks.
              </p>
              <Button variant="outline">
                <Globe className="h-4 w-4 mr-2" />
                Browse Integrations
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* System Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">System Activity Logs</h3>
                  <p className="text-sm text-muted-foreground">Last 7 days of system activity</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => refetchLogs()} disabled={logsLoading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", logsLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {logsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No logs found for the selected period</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="p-4 space-y-2">
                  {logs.map((log) => (
                    <div 
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      {getLogIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground">{log.action}</span>
                          {getLogTypeBadge(log.type)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {log.user && <span>{log.user}</span>}
                          {log.user && log.details && <span>•</span>}
                          {log.details && <span className="truncate">{log.details}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ApiConfigDialog
        open={apiDialogOpen}
        onOpenChange={setApiDialogOpen}
        apiType={apiDialogType}
      />
    </AppLayout>
  );
};

export default Settings;