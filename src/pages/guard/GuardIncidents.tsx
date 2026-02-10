import { useState, useRef } from "react";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useGuardIncidents,
  useCreateIncident,
  useUploadImage,
} from "@/hooks/useGuardData";
import {
  AlertTriangle,
  Plus,
  Loader2,
  X,
  ImagePlus,
  CheckCircle2,
  Clock,
  Shield,
  Wrench,
  Eye,
  AlertCircle,
  Lock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const INCIDENT_TYPES = [
  { value: "general", label: "General", icon: AlertTriangle },
  { value: "security", label: "Security", icon: Shield },
  { value: "safety", label: "Safety", icon: AlertCircle },
  { value: "maintenance", label: "Maintenance", icon: Wrench },
  { value: "suspicious_activity", label: "Suspicious Activity", icon: Eye },
  { value: "emergency", label: "Emergency", icon: AlertTriangle },
  { value: "access_control", label: "Access Control", icon: Lock },
  { value: "other", label: "Other", icon: AlertTriangle },
];

export default function GuardIncidents() {
  const [reportOpen, setReportOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [incidentType, setIncidentType] = useState("general");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: incidents = [], isLoading } = useGuardIncidents();
  const createIncident = useCreateIncident();
  const uploadImage = useUploadImage();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIncidentType("general");
    clearImage();
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    let photoUrl: string | undefined;

    if (imageFile) {
      try {
        photoUrl = await uploadImage.mutateAsync({
          file: imageFile,
          bucket: "patrol-images",
          folder: "incidents",
        });
      } catch (error) {
        return;
      }
    }

    try {
      await createIncident.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        incidentType,
        photoUrl,
      });
      resetForm();
      setReportOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createIncident.isPending || uploadImage.isPending;

  const getIncidentIcon = (type: string) => {
    const found = INCIDENT_TYPES.find((t) => t.value === type);
    return found?.icon || AlertTriangle;
  };

  const getIncidentLabel = (type: string) => {
    const found = INCIDENT_TYPES.find((t) => t.value === type);
    return found?.label || type;
  };

  return (
    <GuardMobileLayout title="Incidents">
      <div className="space-y-4">
        {/* Report Button */}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              Report New Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="incident-title">Title *</Label>
                <Input
                  id="incident-title"
                  placeholder="Brief description of the incident"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-type">Type</Label>
                <Select value={incidentType} onValueChange={setIncidentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="incident-description">Description</Label>
                <Textarea
                  id="incident-description"
                  placeholder="Provide detailed information about the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Photo Evidence</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-20 flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Add photo
                    </span>
                  </Button>
                )}
              </div>

              <Button
                className="w-full"
                variant="destructive"
                onClick={handleSubmit}
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Incidents List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Recent Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </>
            ) : incidents.length > 0 ? (
              incidents.map((incident) => {
                const Icon = getIncidentIcon(incident.incidentType);
                return (
                  <div
                    key={incident.id}
                    className="p-4 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">
                              {incident.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              By {incident.guardName} at {incident.siteName}
                            </p>
                          </div>
                          <Badge
                            variant={incident.resolved ? "outline" : "destructive"}
                          >
                            {incident.resolved ? "Resolved" : "Open"}
                          </Badge>
                        </div>
                        {incident.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {incident.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {getIncidentLabel(incident.incidentType)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(incident.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {incident.photoUrl && (
                          <a
                            href={incident.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2"
                          >
                            <img
                              src={incident.photoUrl}
                              alt="Incident"
                              className="h-20 w-auto rounded object-cover"
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                <p className="text-muted-foreground">No incidents reported</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tap the button above to report an incident
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </GuardMobileLayout>
  );
}
