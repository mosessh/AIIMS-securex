import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Video, 
  Eye, 
  AlertTriangle, 
  CheckCircle2,
  Settings,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraData {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: 'online' | 'offline' | 'alert';
  aiStatus: 'active' | 'inactive';
  lastDetection?: string;
}

const mockCameras: CameraData[] = [
  {
    id: '1',
    name: 'CAM-001',
    location: 'Main Entrance',
    zone: 'Zone A',
    status: 'online',
    aiStatus: 'active',
    lastDetection: 'Guard detected - 2 min ago',
  },
  {
    id: '2',
    name: 'CAM-002',
    location: 'Parking Level B1',
    zone: 'Zone B',
    status: 'online',
    aiStatus: 'active',
  },
  {
    id: '3',
    name: 'CAM-003',
    location: 'Server Room',
    zone: 'Zone C',
    status: 'alert',
    aiStatus: 'active',
    lastDetection: 'No guard detected - 15 min',
  },
  {
    id: '4',
    name: 'CAM-004',
    location: 'Loading Dock',
    zone: 'Zone D',
    status: 'offline',
    aiStatus: 'inactive',
  },
  {
    id: '5',
    name: 'CAM-005',
    location: 'Lobby',
    zone: 'Zone A',
    status: 'online',
    aiStatus: 'active',
    lastDetection: 'Guard detected - 5 min ago',
  },
  {
    id: '6',
    name: 'CAM-006',
    location: 'Warehouse A',
    zone: 'Zone E',
    status: 'online',
    aiStatus: 'active',
  },
];

function CameraCard({ camera }: { camera: CameraData }) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30",
      camera.status === 'alert' && "border-destructive/50",
      camera.status === 'offline' && "opacity-60"
    )}>
      {/* Camera Preview Placeholder */}
      <div className="relative aspect-video rounded-lg bg-secondary mb-4 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {camera.status === 'online' || camera.status === 'alert' ? (
            <Video className="h-12 w-12 text-muted-foreground/50" />
          ) : (
            <WifiOff className="h-12 w-12 text-muted-foreground/50" />
          )}
        </div>
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <Badge 
            variant={
              camera.status === 'online' ? 'success' : 
              camera.status === 'alert' ? 'alert' : 'inactive'
            }
          >
            {camera.status === 'online' && <Wifi className="h-3 w-3 mr-1" />}
            {camera.status === 'alert' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {camera.status === 'offline' && <WifiOff className="h-3 w-3 mr-1" />}
            {camera.status}
          </Badge>
        </div>
        
        {/* AI Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={camera.aiStatus === 'active' ? 'default' : 'inactive'}>
            <Eye className="h-3 w-3 mr-1" />
            AI {camera.aiStatus}
          </Badge>
        </div>
        
        {/* Live indicator */}
        {camera.status === 'online' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-destructive/90 text-destructive-foreground px-2 py-1 rounded text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground"></span>
            </span>
            LIVE
          </div>
        )}
      </div>
      
      {/* Camera Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{camera.name}</h4>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{camera.location}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {camera.zone}
          </Badge>
        </div>
        
        {camera.lastDetection && (
          <p className={cn(
            "text-xs mt-2 pt-2 border-t border-border",
            camera.status === 'alert' ? "text-destructive" : "text-muted-foreground"
          )}>
            {camera.status === 'alert' ? (
              <AlertTriangle className="h-3 w-3 inline mr-1" />
            ) : (
              <CheckCircle2 className="h-3 w-3 inline mr-1" />
            )}
            {camera.lastDetection}
          </p>
        )}
      </div>
    </div>
  );
}

const Cameras = () => {
  const onlineCount = mockCameras.filter(c => c.status === 'online').length;
  const alertCount = mockCameras.filter(c => c.status === 'alert').length;
  
  return (
    <AppLayout 
      title="AI Camera Monitoring" 
      subtitle={`${onlineCount} cameras online • ${alertCount} alerts`}
    >
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{onlineCount}</p>
          <p className="text-sm text-muted-foreground">Online</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{alertCount}</p>
          <p className="text-sm text-muted-foreground">Alerts</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {mockCameras.filter(c => c.status === 'offline').length}
          </p>
          <p className="text-sm text-muted-foreground">Offline</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {mockCameras.filter(c => c.aiStatus === 'active').length}
          </p>
          <p className="text-sm text-muted-foreground">AI Active</p>
        </div>
      </div>

      {/* Cameras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCameras.map((camera) => (
          <CameraCard key={camera.id} camera={camera} />
        ))}
      </div>
    </AppLayout>
  );
};

export default Cameras;
