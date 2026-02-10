import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  MapPin,
  MessageSquare,
  Menu,
  LogOut,
  User,
  Shield,
  Settings,
} from "lucide-react";

interface SupervisorMobileLayoutProps {
  children: ReactNode;
  title?: string;
}

const navigation = [
  { name: "Dashboard", href: "/supervisor", icon: LayoutDashboard },
  { name: "Guards", href: "/supervisor/guards", icon: Users },
  { name: "Alerts", href: "/supervisor/alerts", icon: AlertTriangle },
  { name: "Sites", href: "/supervisor/sites", icon: MapPin },
  { name: "Messages", href: "/supervisor/messages", icon: MessageSquare },
];

const sidebarLinks = [
  ...navigation,
  { name: "Settings", href: "/supervisor/settings", icon: Settings },
];

export function SupervisorMobileLayout({ children, title }: SupervisorMobileLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                  <Shield className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">Geovince</span>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                {sidebarLinks.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.email?.split("@")[0] || "Supervisor"}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      Supervisor
                    </Badge>
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
            </SheetContent>
          </Sheet>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">
            {title || "Geovince"}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
