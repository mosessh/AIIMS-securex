import { useState, useRef, useEffect } from "react";
import { GuardMobileLayout } from "@/components/layout/GuardMobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/components/scanner/QrScanner";
import { CheckpointCountdown } from "@/components/guard/CheckpointCountdown";
import { useScanCheckpoint, useUploadImage, useGuardCheckpoints } from "@/hooks/useGuardData";
import {
  ScanLine,
  Camera,
  X,
  CheckCircle2,
  Loader2,
  MapPin,
  ImagePlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function GuardScan() {
  const [qrInput, setQrInput] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: checkpoints = [] } = useGuardCheckpoints();
  const scanMutation = useScanCheckpoint();
  const uploadMutation = useUploadImage();

  // Get current location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location error:", error);
        }
      );
    }
  }, []);

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

  const handleQrScanned = (result: string) => {
    setQrInput(result);
  };

  const handleScan = async () => {
    if (!qrInput.trim()) return;

    let imageUrl: string | undefined;

    // Upload image first if exists
    if (imageFile) {
      try {
        imageUrl = await uploadMutation.mutateAsync({
          file: imageFile,
          bucket: "patrol-images",
          folder: "patrol",
        });
      } catch (error) {
        return; // Error already handled by mutation
      }
    }

    try {
      await scanMutation.mutateAsync({
        qrCode: qrInput.trim(),
        notes: notes.trim() || undefined,
        imageUrl,
        latitude: location?.lat,
        longitude: location?.lng,
      });

      setScanSuccess(true);
      setQrInput("");
      setNotes("");
      clearImage();

      // Reset success state after 3 seconds
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = scanMutation.isPending || uploadMutation.isPending;

  return (
    <GuardMobileLayout title="Scan Checkpoint">
      <div className="space-y-4">
        {/* Checkpoint Countdown Timer */}
        <CheckpointCountdown checkpoints={checkpoints} />

        {/* Success Message */}
        {scanSuccess && (
          <Card className="border-success bg-success/10">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-success">Checkpoint Scanned!</p>
                <p className="text-sm text-muted-foreground">
                  Your patrol log has been recorded.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Scanner Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="h-5 w-5 text-primary" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera QR Scanner */}
            <div className="space-y-2">
              <Label>Camera Scanner</Label>
              <QrScanner 
                onScan={handleQrScanned}
                onError={(err) => console.log("QR Error:", err)}
              />
            </div>

            {/* Manual QR Input */}
            <div className="space-y-2">
              <Label htmlFor="qr-code">QR Code / Checkpoint Code</Label>
              <Input
                id="qr-code"
                placeholder="Enter or scan QR code..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Use the camera above or enter the code manually
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any observations or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Attach Photo (Optional)</Label>
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
                  className="w-full h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Tap to add photo
                  </span>
                </Button>
              )}
            </div>

            {/* Location Status */}
            {location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-success" />
                <span>Location captured</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleScan}
              disabled={!qrInput.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Record Checkpoint
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Select Checkpoints */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Quick Select Checkpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checkpoints.length > 0 ? (
              checkpoints.map((cp) => (
                <button
                  key={cp.id}
                  onClick={() => setQrInput(cp.qrCode)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {cp.sequenceOrder}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {cp.name}
                      </p>
                      {cp.lastScannedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last:{" "}
                          {formatDistanceToNow(new Date(cp.lastScannedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={cp.isRequired ? "default" : "secondary"}>
                    {cp.isRequired ? "Required" : "Optional"}
                  </Badge>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No checkpoints assigned
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </GuardMobileLayout>
  );
}
