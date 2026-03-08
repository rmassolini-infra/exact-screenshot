import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, project_id } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Save user message
    await supabase.from("rag_messages").insert({
      project_id, role: "user", content: question,
    });

    // Fetch project context
    const [{ data: project }, { data: docs }, { data: assets }, { data: inferences }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", project_id).single(),
      supabase.from("documents").select("id, filename, type, ocr_result, quality_score").eq("project_id", project_id).eq("status", "processed").limit(20),
      supabase.from("assets").select("*").eq("project_id", project_id).limit(50),
      supabase.from("inferences_gie").select("*").eq("project_id", project_id).limit(20),
    ]);

    // Build context from OCR results
    const docContext = (docs ?? []).map(d => {
      const ocr = d.ocr_result as any;
      const text = ocr?.text ? ocr.text.substring(0, 2000) : "(sem OCR)";
      return `[${d.filename} (${d.type})]: ${text}`;
    }).join("\n\n---\n\n");

    const assetContext = (assets ?? []).map(a =>
      `Ativo ${a.codigo}: ${a.tipo}, fabricante=${a.fabricante}, modelo=${a.modelo}, valor_atual=R$${a.valor_atual}, risk=${a.risk_score}`
    ).join("\n");

    const inferenceContext = (inferences ?? []).map(i =>
      `[${i.level}] ${i.title}: ${i.finding} (impacto: R$${i.impact_value})`
    ).join("\n");

    // Call Gemini for RAG answer
    const aiResponse = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em Due Diligence de ativos industriais para o sistema Grafter Asset OS. Responda perguntas baseado EXCLUSIVAMENTE nos documentos e dados do projeto fornecidos abaixo. Se não tiver informação suficiente, diga claramente.

Projeto: ${project?.name} | Empresa: ${project?.target_company} | Preço vendedor: R$${project?.seller_price}

=== DOCUMENTOS OCR ===
${docContext || "(nenhum documento processado)"}

=== ATIVOS ===
${assetContext || "(nenhum ativo cadastrado)"}

=== INFERÊNCIAS GIE ===
${inferenceContext || "(nenhuma inferência gerada)"}

Ao responder:
1. Cite fontes específicas (nome do documento)
2. Indique seu nível de confiança (0-100%)
3. Se a resposta envolver valores monetários, use formato R$ brasileiro
4. Destaque riscos e gaps encontrados`
          },
          { role: "user", content: question }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error("RAG AI error:", status, errText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiResult = await aiResponse.json();
    const answer = aiResult.choices?.[0]?.message?.content ?? "Não consegui gerar uma resposta.";

    // Estimate confidence from answer content
    const confidenceMatch = answer.match(/(\d{1,3})%/);
    const confidence = confidenceMatch ? Math.min(parseFloat(confidenceMatch[1]) / 100, 1.0) : 0.75;

    // Extract source references
    const sourceRefs = (docs ?? [])
      .filter(d => answer.toLowerCase().includes(d.filename.toLowerCase()))
      .map(d => ({ doc_name: d.filename, doc_id: d.id }));

    await supabase.from("rag_messages").insert({
      project_id, role: "assistant", content: answer,
      confidence, needs_human_review: confidence < 0.7,
      sources: sourceRefs.length > 0 ? sourceRefs : null,
    });

    return new Response(JSON.stringify({ answer, confidence, sources: sourceRefs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rag-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
