import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting missed checkpoint check...");

    // Get the grace period from system settings (default 15 minutes)
    const { data: gracePeriodSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "grace_period")
      .single();
    
    const gracePeriodMinutes = gracePeriodSetting?.value 
      ? parseInt(gracePeriodSetting.value) 
      : 15;

    console.log(`Using grace period: ${gracePeriodMinutes} minutes`);

    // Get all active shifts
    const { data: activeShifts, error: shiftsError } = await supabase
      .from("shifts")
      .select(`
        id,
        guard_id,
        site_id,
        start_time,
        end_time
      `)
      .eq("status", "active");

    if (shiftsError) {
      console.error("Error fetching active shifts:", shiftsError);
      throw shiftsError;
    }

    console.log(`Found ${activeShifts?.length || 0} active shifts`);

    if (!activeShifts || activeShifts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active shifts to check", alertsCreated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let alertsCreated = 0;

    for (const shift of activeShifts) {
      console.log(`Checking shift ${shift.id} for site ${shift.site_id}`);

      // Get all required checkpoints for this site
      const { data: checkpoints, error: checkpointsError } = await supabase
        .from("checkpoints")
        .select("id, name, scan_interval, is_required")
        .eq("site_id", shift.site_id)
        .eq("is_required", true);

      if (checkpointsError) {
        console.error(`Error fetching checkpoints for site ${shift.site_id}:`, checkpointsError);
        continue;
      }

      if (!checkpoints || checkpoints.length === 0) {
        console.log(`No required checkpoints for site ${shift.site_id}`);
        continue;
      }

      console.log(`Found ${checkpoints.length} required checkpoints`);

      for (const checkpoint of checkpoints) {
        // Calculate when this checkpoint should have been scanned
        const scanIntervalMs = checkpoint.scan_interval * 60 * 1000;
        const graceMs = gracePeriodMinutes * 60 * 1000;
        const now = new Date();
        const shiftStart = new Date(shift.start_time);
        
        // Calculate how many scan cycles should have occurred
        const timeSinceStart = now.getTime() - shiftStart.getTime();
        const expectedScans = Math.floor(timeSinceStart / scanIntervalMs);
        
        if (expectedScans < 1) {
          // Not enough time has passed for even one scan
          continue;
        }

        // Get all patrol logs for this checkpoint in this shift
        const { data: patrolLogs, error: logsError } = await supabase
          .from("patrol_logs")
          .select("id, scanned_at")
          .eq("checkpoint_id", checkpoint.id)
          .eq("shift_id", shift.id)
          .eq("guard_id", shift.guard_id);

        if (logsError) {
          console.error(`Error fetching patrol logs:`, logsError);
          continue;
        }

        const actualScans = patrolLogs?.length || 0;

        // Check if the last expected scan was missed
        // We check if the last expected scan time + grace period has passed without a scan
        const lastExpectedScanTime = new Date(shiftStart.getTime() + (expectedScans * scanIntervalMs));
        const deadlineWithGrace = new Date(lastExpectedScanTime.getTime() + graceMs);

        if (now > deadlineWithGrace) {
          // Check if there's a scan after the last expected scan time
          const scansAfterExpected = patrolLogs?.filter(
            log => new Date(log.scanned_at) >= lastExpectedScanTime
          ) || [];

          if (scansAfterExpected.length === 0) {
            // Check if we already created an alert for this missed scan
            const alertMessage = `Checkpoint "${checkpoint.name}" was not scanned during the expected interval`;
            
            // Look for existing unacknowledged alert with same message in the last hour
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const { data: existingAlerts } = await supabase
              .from("alerts")
              .select("id")
              .eq("site_id", shift.site_id)
              .eq("guard_id", shift.guard_id)
              .eq("type", "missed_checkpoint")
              .eq("acknowledged", false)
              .gte("created_at", oneHourAgo.toISOString())
              .ilike("message", `%${checkpoint.name}%`);

            if (existingAlerts && existingAlerts.length > 0) {
              console.log(`Alert already exists for checkpoint ${checkpoint.name}`);
              continue;
            }

            // Create alert for missed checkpoint
            const { error: alertError } = await supabase
              .from("alerts")
              .insert({
                type: "missed_checkpoint",
                severity: "high",
                message: alertMessage,
                site_id: shift.site_id,
                guard_id: shift.guard_id,
              });

            if (alertError) {
              console.error(`Error creating alert:`, alertError);
            } else {
              console.log(`Created alert for missed checkpoint: ${checkpoint.name}`);
              alertsCreated++;
            }
          }
        }
      }
    }

    console.log(`Missed checkpoint check complete. Created ${alertsCreated} alerts.`);

    return new Response(
      JSON.stringify({ 
        message: "Missed checkpoint check complete", 
        alertsCreated,
        shiftsChecked: activeShifts.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-missed-checkpoints:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
