import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Provider {
  id: string;
  name: string;
  url: string;
  keyEnv: string;
  model: string;
  headers?: Record<string, string>;
}

const providers: Provider[] = [
  {
    id: "openrouter",
    name: "OpenRouter AI",
    url: "https://openrouter.ai/api/v1/chat/completions",
    keyEnv: "OPENROUTER_API_KEY",
    model: "google/gemini-2.0-flash-exp:free",
    headers: {
      "HTTP-Referer": "https://elizade-ai.vercel.app",
      "X-Title": "Elizade AI",
    },
  },
  {
    id: "google-pro",
    name: "Google Gemini Pro (Research)",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GOOGLE_API_KEY",
    model: "gemini-1.5-pro",
  },
  {
    id: "google",
    name: "Google Gemini Flash (Speed)",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    keyEnv: "GOOGLE_API_KEY",
    model: "gemini-1.5-flash",
  },
  {
    id: "openai",
    name: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { messages, user_id, message, pdfContext, mode = "chat", providerId } = body;

    // --- STATUS CHECK MODE ---
    if (mode === "status") {
      const statuses = await Promise.all(providers.map(async (p) => {
        const key = Deno.env.get(p.keyEnv);
        let purpose = "Backup AI";
        if (p.id === "openrouter") purpose = "Primary AI (Internet Enabled)";
        if (p.id === "google-pro") purpose = "Research AI";
        
        let status = key ? "active" : "inactive";
        let credits = "Unknown";
        
        if (key && p.id === "openrouter") {
          try {
             // OpenRouter specific check (simplified)
             const orRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
               headers: { Authorization: `Bearer ${key}` }
             });
             if (orRes.ok) {
               const data = await orRes.json();
               const limit = data.data?.limit;
               const usage = data.data?.usage;
               if (limit && limit > 0) {
                 const remaining = limit - usage;
                 credits = `$${remaining.toFixed(2)} remaining`;
               } else {
                 credits = "Unlimited (Paid)"
                 if (data.data?.is_free_tier) credits = "Free Tier";
               }
             }
          } catch (e) {
            console.error("OpenRouter status check failed", e);
          }
        } else if (key) {
           credits = "Active (Standard)";
        }

        return {
          id: p.id,
          name: p.name,
          status: status,
          purpose: purpose,
          credits: credits
        };
      }));
      
      const serperKey = Deno.env.get("SERPER_API_KEY");
      statuses.push({
        id: "serper",
        name: "Serper Search API",
        status: serperKey ? "active" : "inactive",
        purpose: "Real-time Search",
        credits: serperKey ? "Active" : "Not Configured"
      });

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

    // Filter providers if a specific one is requested
    let activeProviders = providers;
    if (providerId) {
        const selected = providers.find(p => p.id === providerId);
        if (selected) {
            activeProviders = [selected];
            console.log(`User selected specific provider: ${selected.name}`);
        } else {
            console.warn(`Requested provider ${providerId} not found, falling back to auto.`);
        }
    }

    // Insert user message into database
    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "user",
      content: currentMessage,
    });

    // --- SEARCH LOGIC (SERPER) ---
    // Perform search if key exists to ground the AI or if explicitly asked
    let searchContext = "";
    const serperKey = Deno.env.get("SERPER_API_KEY");
    
    // Simple heuristic: Always search in 'research' mode, or if the user asks a question (naive approach)
    // To keep it efficient, we simply ALWAYS search if Serper is active to give "relay" capability as requested
    if (serperKey) {
        console.log("Serper Key found, attempting search for:", currentMessage);
        try {
            const searchRes = await fetch("https://google.serper.dev/search", {
                method: "POST",
                headers: {
                    "X-API-KEY": serperKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ q: currentMessage, num: 3 })
            });
            
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                const snippets = searchData.organic?.map((r: any) => `- ${r.title}: ${r.snippet}`).join("\n");
                if (snippets) {
                    searchContext = `\n\nInternet Search Results (for up-to-date context):\n${snippets}`;
                    console.log("Search context added");
                }
            }
        } catch (err) {
            console.error("Serper search failed:", err);
        }
    }

    // Prepare system prompt
    let systemPrompt = `You are Elizade AI, an intelligent study assistant for university students at Elizade University.`;
    
    if (searchContext) {
        systemPrompt += searchContext;
        systemPrompt += `\n\nUse the search results above to answer the user's question accurately. If the PDF context contradicts search results, note the discrepancy but prefer the PDF for course-specific questions, and search results for general knowledge.`;
    }

    if (pdfContext) {
      systemPrompt += `\n\nContext from uploaded PDF:\n${pdfContext}\n\nMode: ${mode}`;
    }

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || [{ role: "user", content: currentMessage }]),
    ];

    // --- FALLBACK LOOP ---
    let lastError = null;
    let successfulResponse = null;
    let activeProvider = null;

    for (const provider of activeProviders) {
      const apiKey = Deno.env.get(provider.keyEnv);
      if (!apiKey) continue;

      try {
        console.log(`Attempting provider: ${provider.name}`);
        const res = await fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            ...(provider.headers || {}),
          },
          body: JSON.stringify({
            model: provider.model,
            messages: chatMessages,
            stream: true,
          }),
        });

        if (res.ok) {
          successfulResponse = res;
          activeProvider = provider;
          break; // Success! Exit loop
        } else {
          const errorText = await res.text();
          console.error(`Provider ${provider.name} failed:`, errorText);
          lastError = errorText;
        }
      } catch (err) {
        console.error(`Provider ${provider.name} error:`, err);
        lastError = String(err);
      }
    }

    if (!successfulResponse || !activeProvider) {
      return new Response(
        JSON.stringify({ 
          error: "All AI providers failed", 
          details: lastError || "No providers configured" 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- STREAMING RESPONSE ---
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    (async () => {
      const reader = successfulResponse.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Streaming error:", e);
      } finally {
        writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
