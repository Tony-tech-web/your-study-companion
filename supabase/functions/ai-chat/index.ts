import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { messages, user_id, message, pdfContext, mode = "chat" } = body;

    // Support both direct 'message' (user code) and 'messages' array (frontend code)
    const userId = user_id || body.userId;
    const currentMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userId || !currentMessage) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert user message into database (User's required side effect)
    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "user",
      content: currentMessage,
    });

    const AI_KEY = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_KEY) {
      throw new Error("AI Key (OPENAI_API_KEY or LOVABLE_API_KEY) is not configured");
    }

    // Prepare system prompt based on context and mode
    let systemPrompt = `You are Elizade AI, an intelligent study assistant for university students at Elizade University.`;
    
    if (pdfContext) {
      systemPrompt += `\n\nContext from uploaded PDF:\n${pdfContext}\n\nMode: ${mode}`;
    }

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: currentMessage }])
    ];

    // Request from AI provider with streaming
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("AI Provider Error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI provider error", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use a TransformStream to pass through the AI response while logging it
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullAssistantResponse = "";

    // Process the stream as it flows through
    (async () => {
      const reader = aiRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          await writer.write(value);

          // Extract content from SSE chunks for our database log
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content || "";
                fullAssistantResponse += content;
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        // Once the stream is finished, log the full reply to the database
        if (fullAssistantResponse) {
          await supabase.from("ai_conversations").insert({
            user_id: userId,
            role: "assistant",
            content: fullAssistantResponse,
          });
        }
      } catch (err) {
        console.error("Streaming error:", err);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
