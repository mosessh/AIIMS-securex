import { useState, useRef } from "react";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  useGuardProfile,
  useUpdateProfile,
  useUploadImage,
  useActiveShift,
} from "@/hooks/useGuardData";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  Clock,
  Camera,
  Loader2,
  Save,
  TrendingUp,
} from "lucide-react";

export default function GuardProfile() {
  const { data: profile, isLoading } = useGuardProfile();
  const { data: activeShift } = useActiveShift();
  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadImage();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setFullName(profile.fullName || "");
      setPhone(profile.phone || "");
    }
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const avatarUrl = await uploadImage.mutateAsync({
        file,
        bucket: "avatars",
      });

      await updateProfile.mutateAsync({ avatarUrl });
    } catch (error) {
      // Error handled by mutations
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = updateProfile.isPending || uploadImage.isPending;

  if (isLoading) {
    return (
      <GuardMobileLayout title="Profile">
        <div className="space-y-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </GuardMobileLayout>
    );
  }

  return (
    <GuardMobileLayout title="Profile">
      <div className="space-y-4">
        {/* Avatar & Basic Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile?.fullName?.charAt(0) || profile?.email?.charAt(0) || "G"}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  {uploadImage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-4">
                {profile?.fullName || "Guard"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={
                    profile?.status === "active" || profile?.status === "on_patrol"
                      ? "default"
                      : "secondary"
                  }
                >
                  {profile?.status || "off_duty"}
                </Badge>
                {activeShift && (
                  <Badge variant="outline" className="text-success border-success/50">
                    On Duty
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                <Star className="h-5 w-5" />
                {profile?.rating?.toFixed(1) || "5.0"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-2xl font-bold text-success">
                <TrendingUp className="h-5 w-5" />
                {profile?.attendanceRate || 100}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Attendance</p>
            </CardContent>
          </Card>
        </div>

        {/* Site Assignment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Assigned Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-foreground">
              {profile?.siteName || "No site assigned"}
            </p>
            {activeShift && (
              <div className="mt-2 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Current Shift:</span>
                </div>
                <p className="text-sm font-medium mt-1">
                  {new Date(activeShift.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  -{" "}
                  {new Date(activeShift.endTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Profile Details
              </CardTitle>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFullName(profile?.fullName || "");
                    setPhone(profile?.phone || "");
                    setIsEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">
                      {profile?.fullName || "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{profile?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">
                      {profile?.phone || "Not set"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </GuardMobileLayout>
  );
}
