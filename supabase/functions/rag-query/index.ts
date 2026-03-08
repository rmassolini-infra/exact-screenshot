import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, project_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Save user message
    await supabase.from("rag_messages").insert({
      project_id, role: "user", content: question,
    });

    // Simulated RAG response (replace with actual Claude + pgvector in production)
    const answer = `Baseado na análise dos documentos do projeto, identifiquei informações relevantes para sua pergunta: "${question}". Esta é uma resposta simulada — em produção, será gerada pelo motor RAG com Claude + pgvector.`;
    const confidence = 0.85;

    await supabase.from("rag_messages").insert({
      project_id, role: "assistant", content: answer,
      confidence, needs_human_review: confidence < 0.85,
      sources: [{ doc_name: "Documento Exemplo", page: 1 }],
    });

    return new Response(JSON.stringify({ answer, confidence, sources: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
