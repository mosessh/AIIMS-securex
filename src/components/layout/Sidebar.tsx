import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  MapPin,
  Building2,
  Calendar,
  AlertTriangle,
  FileText,
  Settings,
  Shield,
  Camera,
  BarChart3,
  LogOut,
  UserCog,
  Smartphone,
  MessageSquare,
  Map,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "My Patrol", href: "/guard", icon: Smartphone, guardOnly: true },
  { name: "Guards", href: "/guards", icon: Users },
  { name: "Sites", href: "/sites", icon: Building2 },
  { name: "Checkpoints", href: "/checkpoints", icon: MapPin },
  { name: "Shifts", href: "/shifts", icon: Calendar },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Guard Map", href: "/map", icon: Map },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "AI Cameras", href: "/cameras", icon: Camera },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Users", href: "/users", icon: UserCog, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const roleBadgeVariant = userRole === 'admin' ? 'default' : userRole === 'supervisor' ? 'warning' : 'secondary';

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">SecureGuard</h1>
            <p className="text-xs text-muted-foreground">Command Center</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation
            .filter((item) => {
              if ('adminOnly' in item && item.adminOnly) return userRole === 'admin';
              if ('guardOnly' in item && item.guardOnly) return userRole === 'guard';
              return true;
            })
            .map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.name}
                  {item.name === "Alerts" && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      3
                    </span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* User Footer */}
        <div className="border-t border-sidebar-border p-4 space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email?.split('@')[0] || 'User'}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={roleBadgeVariant} className="text-[10px] px-1.5 py-0">
                  {userRole || 'guard'}
                </Badge>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );
}
