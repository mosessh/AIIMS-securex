import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAssignSupervisorSites, type UserWithDetails } from "@/hooks/useUsers";
import type { Site } from "@/types/guard-tour";

interface AssignSitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithDetails | null;
  sites: Site[];
}

export function AssignSitesDialog({
  open,
  onOpenChange,
  user,
  sites,
}: AssignSitesDialogProps) {
  const assignSites = useAssignSupervisorSites();
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  // Initialize selected sites when dialog opens
  useEffect(() => {
    if (user && open) {
      setSelectedSites(user.assignedSites.map((s) => s.id));
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!user) return;
    await assignSites.mutateAsync({
      userId: user.id,
      siteIds: selectedSites,
    });
    onOpenChange(false);
  };

  const toggleSite = (siteId: string) => {
    setSelectedSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId]
    );
  };

  const activeSites = sites.filter((s) => s.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Assign Sites</DialogTitle>
          <DialogDescription>
            Select sites for {user?.fullName || user?.email} to supervise.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm font-medium">Sites</Label>
          <div className="mt-2 border border-border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
            {activeSites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sites available</p>
            ) : (
              activeSites.map((site) => (
                <div key={site.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`assign-site-${site.id}`}
                    checked={selectedSites.includes(site.id)}
                    onCheckedChange={() => toggleSite(site.id)}
                  />
                  <label
                    htmlFor={`assign-site-${site.id}`}
                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                  >
                    {site.name}
                    {site.address && (
                      <span className="block text-xs text-muted-foreground font-normal">
                        {site.address}
                      </span>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {selectedSites.length} site(s) selected
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={assignSites.isPending}>
            {assignSites.isPending ? "Saving..." : "Save Assignments"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
