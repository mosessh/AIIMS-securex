import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSystemSettings, useUpdateSetting } from "@/hooks/useSystemSettings";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

interface ApiConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiType: "sms" | "email" | "push" | "ai" | null;
}

export function ApiConfigDialog({ open, onOpenChange, apiType }: ApiConfigDialogProps) {
  const { data: settings } = useSystemSettings();
  const updateSetting = useUpdateSetting();

  // SMS fields
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [smsApiKey, setSmsApiKey] = useState("");
  const [smsApiSid, setSmsApiSid] = useState("");
  const [smsSender, setSmsSender] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);

  // Email fields
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  // Push fields
  const [onesignalAppId, setOnesignalAppId] = useState("");

  // Visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setSmsProvider((settings as any).smsProvider || "twilio");
      setSmsApiKey((settings as any).smsApiKey || "");
      setSmsApiSid((settings as any).smsApiSid || "");
      setSmsSender((settings as any).smsSenderNumber || "");
      setSmsEnabled((settings as any).smsEnabled === "true");
      setSmtpHost((settings as any).smtpHost || "");
      setSmtpPort((settings as any).smtpPort || "587");
      setSmtpUser((settings as any).smtpUser || "");
      setSmtpPassword((settings as any).smtpPassword || "");
      setOnesignalAppId((settings as any).onesignalAppId || "");
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (apiType === "sms") {
        await Promise.all([
          updateSetting.mutateAsync({ key: "sms_provider", value: smsProvider }),
          updateSetting.mutateAsync({ key: "sms_api_key", value: smsApiKey || null }),
          updateSetting.mutateAsync({ key: "sms_api_sid", value: smsApiSid || null }),
          updateSetting.mutateAsync({ key: "sms_sender_number", value: smsSender || null }),
          updateSetting.mutateAsync({ key: "sms_enabled", value: smsEnabled ? "true" : "false" }),
        ]);
      } else if (apiType === "email") {
        await Promise.all([
          updateSetting.mutateAsync({ key: "smtp_host", value: smtpHost || null }),
          updateSetting.mutateAsync({ key: "smtp_port", value: smtpPort }),
          updateSetting.mutateAsync({ key: "smtp_user", value: smtpUser || null }),
          updateSetting.mutateAsync({ key: "smtp_password", value: smtpPassword || null }),
        ]);
      } else if (apiType === "push") {
        await updateSetting.mutateAsync({ key: "onesignal_app_id", value: onesignalAppId || null });
      }
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const renderSmsConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Enable SMS Notifications</Label>
        <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
      </div>

      <div className="space-y-2">
        <Label>SMS Provider</Label>
        <Select value={smsProvider} onValueChange={setSmsProvider}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="africastalking">Africa's Talking</SelectItem>
            <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
            <SelectItem value="custom">Custom API</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Account SID / API Username</Label>
        <Input
          value={smsApiSid}
          onChange={(e) => setSmsApiSid(e.target.value)}
          placeholder="Enter Account SID..."
        />
      </div>

      <div className="space-y-2">
        <Label>Auth Token / API Key</Label>
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            value={smsApiKey}
            onChange={(e) => setSmsApiKey(e.target.value)}
            placeholder="Enter Auth Token..."
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sender Phone Number</Label>
        <Input
          value={smsSender}
          onChange={(e) => setSmsSender(e.target.value)}
          placeholder="+1234567890"
        />
      </div>
    </div>
  );

  const renderEmailConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>SMTP Host</Label>
        <Input
          value={smtpHost}
          onChange={(e) => setSmtpHost(e.target.value)}
          placeholder="smtp.gmail.com"
        />
      </div>
      <div className="space-y-2">
        <Label>SMTP Port</Label>
        <Input
          value={smtpPort}
          onChange={(e) => setSmtpPort(e.target.value)}
          placeholder="587"
        />
      </div>
      <div className="space-y-2">
        <Label>Username</Label>
        <Input
          value={smtpUser}
          onChange={(e) => setSmtpUser(e.target.value)}
          placeholder="your@email.com"
        />
      </div>
      <div className="space-y-2">
        <Label>Password</Label>
        <div className="relative">
          <Input
            type={showSmtpPassword ? "text" : "password"}
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            placeholder="Enter password..."
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowSmtpPassword(!showSmtpPassword)}
          >
            {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderPushConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>OneSignal App ID</Label>
        <Input
          value={onesignalAppId}
          onChange={(e) => setOnesignalAppId(e.target.value)}
          placeholder="Enter OneSignal App ID..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Get your App ID from the OneSignal dashboard under Settings → Keys & IDs
      </p>
    </div>
  );

  const titles: Record<string, string> = {
    sms: "SMS Provider Configuration",
    email: "Email (SMTP) Configuration",
    push: "Push Notification Configuration",
    ai: "AI Vision API Configuration",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{apiType ? titles[apiType] : "Configure"}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          {apiType === "sms" && renderSmsConfig()}
          {apiType === "email" && renderEmailConfig()}
          {apiType === "push" && renderPushConfig()}
          {apiType === "ai" && (
            <p className="text-sm text-muted-foreground">
              AI Vision uses Lovable Cloud's built-in AI capabilities. No additional configuration needed.
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
