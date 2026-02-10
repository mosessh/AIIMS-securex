import { useState } from "react";
import { SupervisorMobileLayout } from "@/components/layout/SupervisorMobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGuards } from "@/hooks/useGuards";
import {
  Search,
  Star,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";

export default function SupervisorGuards() {
  const { data: guards = [], isLoading } = useGuards();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = guards.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && (g.status === "active" || g.status === "on_patrol")) ||
      (statusFilter === "off_duty" && g.status === "off_duty") ||
      (statusFilter === "suspended" && g.status === "suspended");
    return matchesSearch && matchesStatus;
  });

  const activeCount = guards.filter(
    (g) => g.status === "active" || g.status === "on_patrol"
  ).length;

  return (
    <SupervisorMobileLayout title="Guards">
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-foreground">{guards.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-success/30">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-success">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-foreground">
                {guards.length - activeCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Off Duty</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="off_duty" className="text-xs">Off Duty</TabsTrigger>
            <TabsTrigger value="suspended" className="text-xs">Suspended</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Guard List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No guards match your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((guard) => (
              <Card key={guard.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={guard.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {guard.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-foreground truncate">
                          {guard.name}
                        </p>
                        <Badge
                          variant={
                            guard.status === "active" || guard.status === "on_patrol"
                              ? "default"
                              : guard.status === "suspended"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px] shrink-0"
                        >
                          {guard.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {guard.siteName || "Unassigned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-warning" />
                          <span className="text-xs font-medium">
                            {guard.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-xs font-medium">
                            {guard.attendanceRate}%
                          </span>
                          <Progress
                            value={guard.attendanceRate}
                            className="h-1 flex-1 ml-1"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <a
                          href={`tel:${guard.phone}`}
                          className="flex items-center gap-1 text-xs text-primary"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </a>
                        <a
                          href={`mailto:${guard.email}`}
                          className="flex items-center gap-1 text-xs text-primary"
                        >
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SupervisorMobileLayout>
  );
}
