export type UserRole = 'super_admin' | 'admin' | 'supervisor' | 'guard';

export type GuardStatus = 'active' | 'on_patrol' | 'off_duty' | 'suspended';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertType = 
  | 'missed_checkpoint' 
  | 'late_attendance' 
  | 'sleep_detected' 
  | 'camera_no_activity'
  | 'panic_button'
  | 'unauthorized_area';

export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'missed';

export interface Site {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  checkpointsCount: number;
  guardsAssigned: number;
  status: 'active' | 'inactive';
  complianceScore: number;
  geofenceRadius: number; // in meters
}

export interface Guard {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  status: GuardStatus;
  role: UserRole;
  siteId?: string;
  siteName?: string;
  rating: number;
  attendanceRate: number;
  currentShiftId?: string;
  lastCheckIn?: Date;
}

export interface Checkpoint {
  id: string;
  name: string;
  siteId: string;
  qrCode: string;
  sequenceOrder: number;
  latitude?: number;
  longitude?: number;
  isRequired: boolean;
  scanInterval: number; // minutes
}

export interface Shift {
  id: string;
  guardId: string;
  guardName: string;
  siteId: string;
  siteName: string;
  startTime: Date;
  endTime: Date;
  status: ShiftStatus;
  checkpointsCompleted: number;
  totalCheckpoints: number;
  attendanceMarked: boolean;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  guardId?: string;
  guardName?: string;
  siteId: string;
  siteName: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface PatrolLog {
  id: string;
  guardId: string;
  checkpointId: string;
  checkpointName: string;
  siteId: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  isOnTime: boolean;
}

export interface DashboardStats {
  activeGuards: number;
  totalGuards: number;
  activePatrols: number;
  sitesMonitored: number;
  alertsToday: number;
  complianceRate: number;
  checkpointsScanned: number;
  incidentsToday: number;
}
