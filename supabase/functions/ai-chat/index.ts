import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Models with automatic fallback
const AI_MODELS = [
  { id: "gemini-flash", name: "Gemini Flash", model: "google/gemini-2.5-flash", priority: 1 },
  { id: "gemini-pro", name: "Gemini Pro", model: "google/gemini-2.5-pro", priority: 2 },
  { id: "gpt-5", name: "GPT-5", model: "openai/gpt-5", priority: 3 },
];

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { messages, user_id, message, pdfContext, mode = "chat", providerId } = body;

    // --- STATUS CHECK MODE ---
    if (mode === "status") {
      const statuses = AI_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        status: lovableApiKey ? "active" : "inactive",
        purpose: m.id === "gemini-flash" ? "Fast responses" : m.id === "gemini-pro" ? "Advanced reasoning" : "Most powerful",
        credits: lovableApiKey ? "Lovable AI" : "Not configured"
      }));
      
      return new Response(JSON.stringify({ services: statuses }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CHAT MODE ---
    const userId = user_id || body.userId;
    const currentMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userId || !currentMessage) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert user message into database
    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "user",
      content: currentMessage,
    });

    // Log learning activity
    try {
      await supabase.from("learning_activity").insert({
        user_id: userId,
        activity_type: "ai_chat",
        activity_count: 1,
      });
    } catch (e) {
      console.log("Activity logging skipped");
    }

    // Build system prompt based on mode
    let systemPrompt = `You are Elizade AI, an intelligent study assistant for university students at Elizade University. You are helpful, encouraging, and focused on helping students learn effectively.`;
    
    if (pdfContext) {
      systemPrompt += `\n\nDocument Context:\n${pdfContext.substring(0, 50000)}`;
    }

    if (mode === "teach") {
      systemPrompt += `\n\nYou are in TEACHING MODE. Your goal is to help the student learn and understand the document content deeply.
- Explain concepts clearly with examples
- Use analogies to make complex topics simple
- Ask follow-up questions to check understanding
- Break down difficult topics into digestible parts
- Encourage the student and praise their progress`;
    } else if (mode === "test") {
      systemPrompt += `\n\nYou are in TEST/QUIZ MODE. Your goal is to assess the student's understanding.
- Ask one question at a time
- Wait for the student's answer before proceeding
- Provide constructive feedback on their answers
- Give hints if they're struggling, but encourage them to think
- Track their progress and adjust difficulty accordingly
- Mix question types: multiple choice, short answer, and explanation questions`;
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: currentMessage }]),
    ];

    // Determine which models to try
    let modelsToTry = [...AI_MODELS];
    if (providerId) {
      const selectedModel = AI_MODELS.find(m => m.id === providerId || m.id === providerId.replace('google', 'gemini-flash').replace('google-pro', 'gemini-pro').replace('openrouter', 'gpt-5'));
      if (selectedModel) {
        // Put selected model first, then others as fallback
        modelsToTry = [selectedModel, ...AI_MODELS.filter(m => m.id !== selectedModel.id)];
      }
    }

    // Try each model with automatic fallback
    let successfulResponse = null;
    let lastError = null;

    for (const aiModel of modelsToTry) {
      try {
        console.log(`Attempting ${aiModel.name} (${aiModel.model})`);
        
        const res = await fetch(AI_GATEWAY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: aiModel.model,
            messages: chatMessages,
            stream: true,
          }),
        });

        if (res.ok) {
          successfulResponse = res;
          console.log(`Success with ${aiModel.name}`);
          break;
        } else {
          const errorText = await res.text();
          console.error(`${aiModel.name} failed:`, res.status, errorText);
          lastError = errorText;
          
          // Check for rate limit - if so, try next model immediately
          if (res.status === 429) {
            console.log("Rate limited, trying next model...");
            continue;
          }
        }
      } catch (err) {
        console.error(`${aiModel.name} error:`, err);
        lastError = String(err);
      }
    }

    if (!successfulResponse) {
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response
    return new Response(successfulResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
