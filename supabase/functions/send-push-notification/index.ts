import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  alertId: string;
  type: string;
  severity: string;
  message: string;
  siteName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.log("OneSignal not configured, skipping push notification");
      return new Response(
        JSON.stringify({ message: "OneSignal not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    console.log("Sending push notification for alert:", payload.alertId);

    // Get admin/supervisor user IDs for targeting
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "supervisor"]);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins or supervisors found for push notification");
      return new Response(
        JSON.stringify({ message: "No recipients found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create external_user_ids for OneSignal targeting
    const externalUserIds = adminRoles.map((r) => r.user_id);

    // Determine priority based on severity
    const priority = payload.severity === "critical" ? 10 : payload.severity === "high" ? 8 : 5;

    // Send push notification via OneSignal API
    const pushResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        include_external_user_ids: externalUserIds,
        contents: {
          en: payload.message,
        },
        headings: {
          en: `🚨 ${payload.severity.toUpperCase()}: ${payload.type.replace(/_/g, " ").toUpperCase()}`,
        },
        subtitle: {
          en: payload.siteName,
        },
        priority,
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
        android_channel_id: "security-alerts",
        data: {
          alertId: payload.alertId,
          type: payload.type,
          severity: payload.severity,
        },
        // Web push specific
        web_url: `${Deno.env.get("SITE_URL") || "https://watchful-site-pulse.lovable.app"}/alerts`,
        chrome_web_icon: "https://watchful-site-pulse.lovable.app/favicon.ico",
        firefox_icon: "https://watchful-site-pulse.lovable.app/favicon.ico",
      }),
    });

    const pushResult = await pushResponse.json();
    console.log("OneSignal response:", pushResult);

    if (!pushResponse.ok) {
      throw new Error(`OneSignal error: ${JSON.stringify(pushResult)}`);
    }

    return new Response(
      JSON.stringify({ success: true, result: pushResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
