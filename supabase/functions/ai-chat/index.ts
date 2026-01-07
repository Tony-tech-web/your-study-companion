import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Models with automatic fallback - OpenAI first, then Gemini
const AI_MODELS = [
  { 
    id: "gpt-4-turbo", 
    name: "GPT-4 Turbo", 
    model: "gpt-4-turbo-preview", 
    priority: 1,
    provider: "openai",
    url: "https://api.openai.com/v1/chat/completions"
  },
  { 
    id: "gpt-4", 
    name: "GPT-4", 
    model: "gpt-4", 
    priority: 2,
    provider: "openai",
    url: "https://api.openai.com/v1/chat/completions"
  },
  { 
    id: "gemini-flash", 
    name: "Gemini Flash", 
    model: "gemini-1.5-flash", 
    priority: 3,
    provider: "gemini",
    url: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent"
  },
  { 
    id: "gemini-pro", 
    name: "Gemini Pro", 
    model: "gemini-1.5-pro", 
    priority: 4,
    provider: "gemini",
    url: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:streamGenerateContent"
  },
];

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { messages, user_id, message, pdfContext, mode = "chat", providerId } = body;

    // --- STATUS CHECK MODE ---
    if (mode === "status") {
      const services = [
        {
          id: "openai",
          name: "OpenAI",
          status: openaiApiKey ? "active" : "inactive",
          purpose: "Primary AI chat and PDF parsing",
          credits: openaiApiKey ? "Configured" : "Not configured"
        },
        {
          id: "serper",
          name: "Serper API",
          status: serperApiKey ? "active" : "inactive",
          purpose: "Web search capabilities",
          credits: serperApiKey ? "Configured" : "Not configured"
        },
        {
          id: "gemini",
          name: "Google Gemini",
          status: geminiApiKey ? "active" : "inactive",
          purpose: "Fallback AI provider (Gemini models)",
          credits: geminiApiKey ? "Configured" : "Not configured"
        }
      ];
      
      return new Response(JSON.stringify({ services }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- CHAT MODE ---
    const userId = user_id || body.userId;
    const currentMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userId || !currentMessage) {
      console.error("Missing user_id or message", { userId, currentMessage });
      return new Response(
        JSON.stringify({ error: "Missing user_id or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert user message into database
    try {
      await supabase.from("ai_conversations").insert({
        user_id: userId,
        role: "user",
        content: currentMessage,
      });
    } catch (dbErr) {
      console.error("Database insert error (non-fatal):", dbErr);
    }

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
      const pId = String(providerId);
      // Use exact mapping to avoid partial replacements (like google-pro becoming gemini-flash-pro)
      const mapping: Record<string, string> = {
        'google': 'gemini-flash',
        'google-pro': 'gemini-pro',
        'openrouter': 'gpt-4-turbo'
      };
      
      const mappedId = mapping[pId] || pId;
      const selectedModel = AI_MODELS.find(m => m.id === mappedId || m.id === pId);
      
      if (selectedModel) {
        modelsToTry = [selectedModel, ...AI_MODELS.filter(m => m.id !== selectedModel.id)];
      }
    }

    // Try each model with automatic fallback
    let successfulResponse = null;
    let lastError = null;

    for (const aiModel of modelsToTry) {
      try {
        console.info(`Attempting ${aiModel.name} (${aiModel.model})`);
        
        let apiKey: string | undefined;
        let requestBody: any;
        let requestUrl: string;
        
        if (aiModel.provider === "openai") {
          apiKey = openaiApiKey;
          requestUrl = aiModel.url;
          requestBody = {
            model: aiModel.model,
            messages: chatMessages,
            stream: true,
          };
        } else if (aiModel.provider === "gemini") {
          apiKey = geminiApiKey;
          // Gemini uses alt=sse for streaming
          requestUrl = `${aiModel.url}?key=${apiKey}&alt=sse`;
          
          // Convert OpenAI format to Gemini format
          const geminiContents = chatMessages
            .filter(m => m.role !== "system")
            .map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: String(m.content) }]
            }));
          
          const systemInstruction = chatMessages.find(m => m.role === "system");
          
          requestBody = {
            contents: geminiContents,
            systemInstruction: systemInstruction ? {
              parts: [{ text: String(systemInstruction.content) }]
            } : undefined,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048, // Reduced for faster response
            }
          };
        } else {
          console.error("Unknown provider:", aiModel.provider);
          continue;
        }
        
        if (!apiKey) {
          console.warn(`${aiModel.name} skipped: API key missing`);
          continue;
        }
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        if (aiModel.provider === "openai") {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        
        const res = await fetch(requestUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (res.ok) {
          if (aiModel.provider === "gemini") {
            // Transform Gemini SSE to OpenAI SSE format
            const reader = res.body?.getReader();
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            
            const stream = new ReadableStream({
              async start(controller) {
                try {
                  let buffer = "";
                  while (true) {
                    const { done, value } = await reader!.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || "";
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        try {
                          const data = JSON.parse(line.slice(6));
                          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                          if (text) {
                            const openaiChunk = {
                              choices: [{
                                delta: { content: text },
                                index: 0
                              }]
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                          }
                        } catch (e) {
                          // Continue on parse error
                        }
                      }
                    }
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                } catch (err) {
                  console.error("Gemini stream error:", err);
                  controller.error(err);
                }
              }
            });
            
            successfulResponse = new Response(stream, {
              headers: { ...corsHeaders, "Content-Type": "text/event-stream" }
            });
          } else {
            successfulResponse = res;
          }
          console.info(`Success with ${aiModel.name}`);
          break;
        } else {
          const errorText = await res.text();
          console.error(`${aiModel.name} failed (${res.status}):`, errorText);
          lastError = `${aiModel.name} error: ${errorText}`;
          
          if (res.status === 429) continue; // Try next on rate limit
        }
      } catch (err) {
        console.error(`${aiModel.name} exception:`, err);
        lastError = String(err);
      }
    }

    if (!successfulResponse) {
      console.error("All AI models failed. Final error:", lastError);
      return new Response(
        JSON.stringify({ 
          error: "AI services are currently unavailable.", 
          details: lastError 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the successful response (possibly transformed)
    if (successfulResponse instanceof Response) {
      // Re-add CORS headers to the response
      const newHeaders = new Headers(successfulResponse.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => newHeaders.set(k, v));
      
      return new Response(successfulResponse.body, {
        status: successfulResponse.status,
        statusText: successfulResponse.statusText,
        headers: newHeaders
      });
    }
    
    return successfulResponse;

  } catch (error) {
    console.error("Critical edge function error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
