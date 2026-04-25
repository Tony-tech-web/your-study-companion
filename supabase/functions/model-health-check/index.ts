import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Check which keys are actually set in Supabase secrets
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  const serperKey = Deno.env.get("SERPER_API_KEY");

  // Do real liveness pings (fast, HEAD-style or minimal POST)
  const results: Record<string, boolean> = {};

  // OpenAI — list models (cheap, no tokens)
  results.openai = false;
  if (openaiKey) {
    try {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      results.openai = r.ok;
    } catch { results.openai = false; }
  }

  // Gemini — list models
  results.gemini = false;
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      results.gemini = r.ok;
    } catch { results.gemini = false; }
  }

  // OpenRouter — check auth
  results.openrouter = false;
  if (openrouterKey) {
    try {
      const r = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${openrouterKey}` },
        signal: AbortSignal.timeout(5000),
      });
      results.openrouter = r.ok;
    } catch { results.openrouter = false; }
  }

  // Serper — just check key presence (no free ping endpoint)
  results.serper = !!serperKey;

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
