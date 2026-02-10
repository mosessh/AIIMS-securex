import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useUsers, type UserWithDetails } from "@/hooks/useUsers";
import { useSites } from "@/hooks/useSites";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Plus, 
  UserPlus, 
  Trash2, 
  MapPin, 
  Shield, 
  Users as UsersIcon,
  AlertTriangle
} from "lucide-react";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { AssignSitesDialog } from "@/components/users/AssignSitesDialog";
import { Navigate } from "react-router-dom";

interface UserCardProps {
  user: UserWithDetails;
  onDelete: (user: UserWithDetails) => void;
  onAssignSites: (user: UserWithDetails) => void;
  currentUserId?: string;
}

function UserCard({ user, onDelete, onAssignSites, currentUserId }: UserCardProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "supervisor": return "warning";
      default: return "secondary";
    }
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
            <UsersIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">
              {user.fullName || user.email.split("@")[0]}
            </h4>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {user.role}
        </Badge>
      </div>

      {user.role === "supervisor" && (
        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Sites:</p>
          <div className="flex flex-wrap gap-1">
            {user.assignedSites.length > 0 ? (
              user.assignedSites.map((site) => (
                <Badge key={site.id} variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {site.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No sites assigned</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {user.role === "supervisor" && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onAssignSites(user)}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Assign Sites
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={user.role === "supervisor" ? "" : "flex-1"}
          onClick={() => onDelete(user)}
          disabled={isCurrentUser}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
      {isCurrentUser && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          You cannot delete your own account
        </p>
      )}
    </div>
  );
}

const Users = () => {
  const { data: users = [], isLoading } = useUsers();
  const { data: sites = [] } = useSites();
  const { userRole, user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserWithDetails | null>(null);
  const [assigningSitesUser, setAssigningSitesUser] = useState<UserWithDetails | null>(null);

  // Only admins can access this page
  if (userRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesSearch =
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      supervisor: users.filter((u) => u.role === "supervisor").length,
      guard: users.filter((u) => u.role === "guard").length,
    };
  }, [users]);

  return (
    <AppLayout title="Users" subtitle={`${users.length} system users`}>
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Role Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge
          variant={roleFilter === "all" ? "active" : "secondary"}
          className="cursor-pointer px-4 py-2"
          onClick={() => setRoleFilter("all")}
        >
          <UsersIcon className="h-3 w-3 mr-1" />
          All ({roleCounts.all})
        </Badge>
        <Badge
          variant={roleFilter === "admin" ? "active" : "secondary"}
          className="cursor-pointer px-4 py-2"
          onClick={() => setRoleFilter("admin")}
        >
          <Shield className="h-3 w-3 mr-1" />
          Admins ({roleCounts.admin})
        </Badge>
        <Badge
          variant={roleFilter === "supervisor" ? "active" : "secondary"}
          className="cursor-pointer px-4 py-2"
          onClick={() => setRoleFilter("supervisor")}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Supervisors ({roleCounts.supervisor})
        </Badge>
        <Badge
          variant={roleFilter === "guard" ? "active" : "secondary"}
          className="cursor-pointer px-4 py-2"
          onClick={() => setRoleFilter("guard")}
        >
          <UsersIcon className="h-3 w-3 mr-1" />
          Guards ({roleCounts.guard})
        </Badge>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onDelete={setDeletingUser}
              onAssignSites={setAssigningSitesUser}
              currentUserId={currentUser?.id}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            {searchQuery || roleFilter !== "all"
              ? "No users match your filters"
              : "No users found. Add your first user to get started."}
          </div>
        )}
      </div>

      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        sites={sites}
      />

      <DeleteUserDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        user={deletingUser}
      />

      <AssignSitesDialog
        open={!!assigningSitesUser}
        onOpenChange={(open) => !open && setAssigningSitesUser(null)}
        user={assigningSitesUser}
        sites={sites}
      />
    </AppLayout>
  );
};

export default Users;
