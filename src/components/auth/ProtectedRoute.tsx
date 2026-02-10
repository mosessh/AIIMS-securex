import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'supervisor' | 'guard';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Role-based routing when accessing generic admin routes (no requiredRole)
  if (!requiredRole) {
    // Guards should go to their mobile dashboard
    if (userRole === 'guard') {
      return <Navigate to="/guard/home" replace />;
    }
    // Admins and supervisors can access admin routes
    return <>{children}</>;
  }

  // When a specific role is required
  const roleHierarchy: Record<string, number> = { admin: 3, supervisor: 2, guard: 1 };
  const userRoleLevel = userRole ? roleHierarchy[userRole] || 0 : 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

  // Allow access if user's role level is >= required role level
  if (userRoleLevel >= requiredRoleLevel) {
    return <>{children}</>;
  }

  // Redirect to appropriate interface based on actual role
  if (userRole === 'guard') {
    return <Navigate to="/guard/home" replace />;
  }
  if (userRole === 'supervisor') {
    return <Navigate to="/supervisor" replace />;
  }
  return <Navigate to="/" replace />;
}
