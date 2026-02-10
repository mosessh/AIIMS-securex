import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface AlertPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    type: string;
    severity: string;
    message: string;
    site_id: string;
    guard_id: string | null;
    created_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AlertPayload = await req.json();
    console.log("Received alert payload:", JSON.stringify(payload));

    // Only send notifications for critical or high severity alerts
    if (payload.record.severity !== "critical" && payload.record.severity !== "high") {
      console.log(`Skipping notification for ${payload.record.severity} severity alert`);
      return new Response(
        JSON.stringify({ message: "Notification not sent - severity too low" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get site information
    const { data: site } = await supabase
      .from("sites")
      .select("name, address")
      .eq("id", payload.record.site_id)
      .single();

    const siteName = site?.name || "Unknown Site";
    const siteAddress = site?.address || "";

    // Get guard name if applicable
    let guardName = "N/A";
    if (payload.record.guard_id) {
      const { data: guard } = await supabase
        .from("guards")
        .select("user_id")
        .eq("id", payload.record.guard_id)
        .single();

      if (guard?.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", guard.user_id)
          .single();
        guardName = profile?.full_name || "Unknown Guard";
      }
    }

    // Get admin/supervisor emails from profiles with admin/supervisor roles
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "supervisor"]);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins or supervisors found to notify");
      return new Response(
        JSON.stringify({ message: "No recipients found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = adminRoles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email")
      .in("id", userIds);

    const emails = profiles?.map(p => p.email).filter(Boolean) || [];

    if (emails.length === 0) {
      console.log("No email addresses found for admins/supervisors");
      return new Response(
        JSON.stringify({ message: "No email addresses found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending alert notification to ${emails.length} recipients:`, emails);

    const severityColor = payload.record.severity === "critical" ? "#dc2626" : "#f59e0b";
    const severityLabel = payload.record.severity.toUpperCase();

    // Send email
    const emailResponse = await resend.emails.send({
      from: "SecureGuard Alerts <onboarding@resend.dev>",
      to: emails,
      subject: `🚨 ${severityLabel} Alert: ${payload.record.type.replace(/_/g, " ").toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🛡️ SecureGuard Alert</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
            <div style="background: ${severityColor}; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 16px;">
              ${severityLabel} SEVERITY
            </div>
            
            <h2 style="color: #1e293b; margin: 0 0 16px 0;">
              ${payload.record.type.replace(/_/g, " ").toUpperCase()}
            </h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              ${payload.record.message}
            </p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Site:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${siteName}</td>
                </tr>
                ${siteAddress ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Address:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${siteAddress}</td>
                </tr>
                ` : ""}
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Guard:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${guardName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">
                    ${new Date(payload.record.created_at).toLocaleString()}
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin: 20px 0 0 0; text-align: center;">
              This is an automated alert from SecureGuard Command Center.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Error sending alert notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
