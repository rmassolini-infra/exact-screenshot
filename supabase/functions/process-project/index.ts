import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update status to processing
    await supabase.from("projects").update({ status: "ocr" }).eq("id", project_id);

    // For now, simulate pipeline steps with status updates
    const steps = ["ocr", "valuation", "gie", "atgi", "ready"];
    for (const step of steps) {
      await supabase.from("projects").update({ status: step }).eq("id", project_id);
      // In production, each step would call Claude API for actual processing
    }

    // Set KPIs
    await supabase.from("projects").update({
      status: "ready",
      kpi_ocr_precision: 97.3,
      kpi_dd_reduction: 68.0,
      kpi_gie_accuracy: 87.0,
      kpi_atgi_coverage: 82.0,
    }).eq("id", project_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
