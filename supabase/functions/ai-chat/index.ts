import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper for Year Extraction and Sanitization
const cleanText = (text: string) => text.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, 500);

const extractYear = (info: string) => {
  const yearMatch = info?.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : "n.d.";
};

// Helper for General Web Search
async function performWebSearch(query: string) {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return "";

  const signal = AbortSignal.timeout(5000);

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 4 }),
      signal,
    });
    const data = await response.json();
    const snippets = (data.organic || []).map((s: any) => `${s.title}: ${s.snippet}`).join("\n");
    return snippets ? `\n\n--- WEB SEARCH CONTEXT ---\n${snippets}\n-------------------------` : "";
  } catch (e) {
    console.error("Web search failed or timed out:", e);
    return "";
  }
}

// Scholar Search Function
async function performScholarSearch(query: string, retries = 1) {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return { promptString: "Research unavailable.", citations: [] };

  const signal = AbortSignal.timeout(10000);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch("https://google.serper.dev/scholar", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: 6 }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) continue;
        throw new Error(`Serper Error: ${response.status}`);
      }

      const data = await response.json();

      const results = (data.organic || []).map((paper: any, index: number) => ({
        id: `ref-${index + 1}`,
        title: paper.title,
        authors: paper.publicationInfo || "Unknown Authors",
        year: extractYear(paper.publicationInfo),
        snippet: cleanText(paper.snippet),
        link: paper.link,
      }));

      const promptString = results.map((r: any) =>
        `[${r.id}] ${r.title} (${r.year})\nSource: ${r.authors}\nSnippet: ${r.snippet}`
      ).join("\n\n");

      return { promptString, citations: results };
    } catch (err) {
      if (attempt === retries) {
        console.error("Scholar search failed after retries:", err);
        return { promptString: "Search currently unavailable.", citations: [] };
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return { promptString: "", citations: [] };
}

// AI Model caller with fallback chain
async function callAI(
  messages: any[],
  providerId: string,
  pdfImages?: string[],
  stream = true
) {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

  const errors: string[] = [];

  // Build model priority based on user selection
  const modelChain: Array<{ provider: string; model: string; key?: string }> = [];

  if (providerId === "google" || providerId === "google-pro") {
    // Gemini first
    if (geminiKey) {
      modelChain.push({ provider: "gemini", model: providerId === "google-pro" ? "gemini-2.0-flash" : "gemini-2.0-flash-lite", key: geminiKey });
    }
    if (openrouterKey) {
      modelChain.push({ provider: "openrouter", model: "google/gemini-2.0-flash-001", key: openrouterKey });
    }
  } else if (providerId === "openrouter") {
    // OpenRouter GPT first
    if (openrouterKey) {
      modelChain.push({ provider: "openrouter", model: "openai/gpt-4o", key: openrouterKey });
    }
    if (openaiKey) {
      modelChain.push({ provider: "openai", model: "gpt-4o", key: openaiKey });
    }
  } else {
    // Default: try Gemini, then OpenRouter
    if (geminiKey) {
      modelChain.push({ provider: "gemini", model: "gemini-2.0-flash-lite", key: geminiKey });
    }
    if (openrouterKey) {
      modelChain.push({ provider: "openrouter", model: "google/gemini-2.0-flash-001", key: openrouterKey });
    }
    if (openaiKey) {
      modelChain.push({ provider: "openai", model: "gpt-4o-mini", key: openaiKey });
    }
  }

  // Fallback chain
  if (geminiKey && !modelChain.some(m => m.provider === "gemini")) {
    modelChain.push({ provider: "gemini", model: "gemini-2.0-flash-lite", key: geminiKey });
  }

  for (const config of modelChain) {
    try {
      console.log(`Attempting ${config.provider} (${config.model})`);

      if (config.provider === "gemini") {
        // Gemini API - merge system prompt into first user message
        const systemPrompt = messages.find(m => m.role === "system")?.content || "";
        const nonSystemMessages = messages.filter(m => m.role !== "system");

        // Build contents array
        const contents: any[] = [];

        for (let i = 0; i < nonSystemMessages.length; i++) {
          const msg = nonSystemMessages[i];
          const role = msg.role === "assistant" ? "model" : "user";

          let parts: any[] = [];

          // For first user message, prepend system prompt
          if (i === 0 && role === "user" && systemPrompt) {
            parts.push({ text: `${systemPrompt}\n\n${msg.content}` });
          } else {
            parts.push({ text: msg.content });
          }

          // Add images to the last user message only
          if (i === nonSystemMessages.length - 1 && role === "user" && pdfImages?.length) {
            for (const img of pdfImages.slice(0, 2)) {
              if (img.startsWith("data:image")) {
                const base64Data = img.split(",")[1];
                parts.push({
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data
                  }
                });
              }
            }
          }

          contents.push({ role, parts });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:${stream ? "streamGenerateContent" : "generateContent"}?key=${config.key}`;

        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`Gemini ${config.model} failed (${res.status}): ${errText}`);
          console.error(`Gemini ${config.model} failed (${res.status}): ${errText}`);
          continue;
        }

        return { response: res, provider: "gemini", model: config.model };
      }

      if (config.provider === "openrouter") {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://elizade-ai.lovable.app",
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: 4096,
            stream,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`OpenRouter failed (${res.status}): ${errText}`);
          console.error(`OpenRouter failed (${res.status}): ${errText}`);
          continue;
        }

        return { response: res, provider: "openrouter", model: config.model };
      }

      if (config.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: 4096,
            stream,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`OpenAI failed (${res.status}): ${errText}`);
          console.error(`OpenAI failed (${res.status}): ${errText}`);
          continue;
        }

        return { response: res, provider: "openai", model: config.model };
      }
    } catch (e) {
      errors.push(`${config.provider} error: ${e}`);
      console.error(`${config.provider} error:`, e);
    }
  }

  console.error("All AI models failed. Final error:", errors.join("; "));
  throw new Error(`All AI models failed: ${errors.join("; ")}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, providerId, pdfContext, pdfImages, ocrContext, mode, userId, scanProgress } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build system prompt based on mode
    let systemPrompt = `You are Elizade AI, an intelligent study assistant for university students. Be concise, helpful, and academically rigorous.`;

    if (pdfContext) {
      if (mode === "teach") {
        systemPrompt = `You are Elizade AI, an expert tutor. You have been given content from a student's PDF document.

TEACHING MODE ACTIVE:
- Explain concepts clearly and thoroughly
- Use examples and analogies
- Break down complex topics
- Ask comprehension questions
- Reference specific sections from the document

${scanProgress ? `Currently viewing pages 1-${scanProgress.current} of ${scanProgress.total} total pages.` : ""}

DOCUMENT CONTENT:
${pdfContext.substring(0, 15000)}`;
      } else if (mode === "test") {
        systemPrompt = `You are Elizade AI in TEST MODE. Quiz the student on the document content.

TESTING RULES:
- Ask one question at a time
- Wait for their answer before revealing if correct
- Vary question difficulty
- Cover key concepts from the material
- Provide brief explanations after each answer

DOCUMENT CONTENT:
${pdfContext.substring(0, 15000)}`;
      } else {
        systemPrompt += `\n\nDocument context available:\n${pdfContext.substring(0, 10000)}`;
      }
    }

    // Add web search for general queries without PDF context
    if (!pdfContext && messages.length > 0) {
      const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
      if (lastUserMessage) {
        const webContext = await performWebSearch(lastUserMessage.content);
        if (webContext) {
          systemPrompt += webContext;
        }
      }
    }

    // Prepare messages with system prompt
    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10), // Keep last 10 messages for context
    ];

    const { response, provider, model } = await callAI(aiMessages, providerId || "google", pdfImages, true);

    // Handle streaming based on provider
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");

    if (provider === "gemini") {
      // Gemini returns JSON chunks, transform to SSE
      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          const text = new TextDecoder().decode(chunk);
          try {
            // Gemini streaming returns JSON array chunks
            const lines = text.split("\n").filter(l => l.trim());
            for (const line of lines) {
              if (line.startsWith("[") || line.startsWith(",") || line.startsWith("{")) {
                const cleanLine = line.replace(/^\[|,$/g, "").trim();
                if (cleanLine) {
                  try {
                    const parsed = JSON.parse(cleanLine);
                    const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (content) {
                      const sseData = JSON.stringify({ choices: [{ delta: { content } }] });
                      controller.enqueue(new TextEncoder().encode(`data: ${sseData}\n\n`));
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }
          } catch (e) {
            console.error("Transform error:", e);
          }
        },
        flush(controller) {
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        }
      });

      return new Response(response.body?.pipeThrough(transformStream), { headers });
    }

    // OpenAI/OpenRouter already return SSE format
    return new Response(response.body, { headers });

  } catch (error) {
    console.error("ai-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "AI chat failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
