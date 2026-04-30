import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Helper to validate JWT and extract user
async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace("Bearer ", "");
  
  try {
    // Use getUser — the correct method in supabase-js v2
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data?.user) {
      console.error("Auth validation failed:", error?.message || "No user found");
      return { userId: null, error: "Invalid or expired token" };
    }
    
    const userId = data.user.id;
    if (!userId) {
      return { userId: null, error: "Invalid token: no user ID" };
    }
    
    return { userId, error: null };
  } catch (e) {
    console.error("Auth validation exception:", e);
    return { userId: null, error: "Authentication failed" };
  }
}

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

// AI Model caller (OpenRouter only)
function attachImagesToLastUserMessage(messages: any[], pdfImages?: string[]) {
  const images = (pdfImages || [])
    .filter((img) => typeof img === "string" && img.startsWith("data:image"))
    .slice(0, 2);

  if (!images.length) return messages;

  const lastUserFromEnd = [...messages].reverse().findIndex((m) => m?.role === "user");
  if (lastUserFromEnd === -1) return messages;

  const idx = messages.length - 1 - lastUserFromEnd;
  const last = messages[idx];
  if (!last || typeof last.content !== "string") return messages;

  const contentParts = [
    { type: "text", text: last.content },
    ...images.map((url) => ({ type: "image_url", image_url: { url } })),
  ];

  const next = messages.slice();
  next[idx] = { ...last, content: contentParts };
  return next;
}

// Normalize messages for Gemini — must alternate user/model, start with user
// Build Gemini contents with optional inline PDF documents
function buildGeminiContents(messages: any[], pdfDocuments?: Array<{base64: string; fileName: string}>) {
  const { contents, systemInstruction } = normalizeForGemini(messages);
  
  if (pdfDocuments && pdfDocuments.length > 0) {
    // Attach PDFs to the last user message
    const lastUserIdx = contents.map((c: any) => c.role).lastIndexOf("user");
    if (lastUserIdx >= 0) {
      const pdfParts = pdfDocuments.map(doc => ({
        inline_data: { mime_type: "application/pdf", data: doc.base64 }
      }));
      // Insert PDF parts before the text part
      contents[lastUserIdx].parts = [...pdfParts, ...contents[lastUserIdx].parts];
    }
  }
  
  return { contents, systemInstruction };
}

function normalizeForGemini(messages: any[]): { contents: any[]; systemInstruction?: string } {
  const systemMsg = messages.find((m: any) => m.role === "system");
  const chatMsgs = messages.filter((m: any) => m.role !== "system");

  // Map roles
  const mapped = chatMsgs.map((m: any) => ({
    role: m.role === "assistant" ? "model" : "user",
    text: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  // Collapse consecutive same-role messages
  const deduped: { role: string; text: string }[] = [];
  for (const msg of mapped) {
    if (deduped.length > 0 && deduped[deduped.length - 1].role === msg.role) {
      deduped[deduped.length - 1].text += "\n" + msg.text;
    } else {
      deduped.push({ ...msg });
    }
  }

  // Gemini must start with "user" — if first is "model", prepend a dummy user turn
  if (deduped.length === 0 || deduped[0].role === "model") {
    deduped.unshift({ role: "user", text: "Hello" });
  }

  const contents = deduped.map(m => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  return {
    contents,
    systemInstruction: systemMsg?.content,
  };
}

// Call Gemini directly via REST API
async function callGemini(messages: any[], modelId: string, stream: boolean, pdfDocuments?: Array<{base64: string; fileName: string}>) {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) throw new HttpError(503, "GEMINI_API_KEY not configured in Supabase secrets.");

  const geminiModel = modelId === "google-pro" ? "gemini-2.0-flash" : "gemini-2.0-flash-lite";
  const { contents, systemInstruction } = buildGeminiContents(messages, pdfDocuments);

  const body: any = { contents };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${geminiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`Gemini failed (${res.status}): ${errText}`);
    // 400 = bad request (our formatting issue), 403 = auth, 429 = rate limit
    // Don't cascade on auth errors — Gemini key is wrong
    if (res.status === 403) throw new HttpError(403, "Gemini API key invalid or not enabled. Check GEMINI_API_KEY in Supabase secrets.");
    throw new HttpError(res.status, `Gemini error (${res.status}). Try switching to a different model.`);
  }

  return { response: res, provider: "gemini", model: geminiModel };
}

async function callAI(
  messages: any[],
  providerId: string,
  pdfImages?: string[],
  stream = true,
  requestOrigin?: string,
  pdfDocuments?: Array<{base64: string; fileName: string}>,
) {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

  const orMessages = attachImagesToLastUserMessage(messages, pdfImages);

  // ─── Explicit routing by providerId ───────────────────────────────────────
  // "google" → Gemini Flash directly (free, no OpenRouter)
  // "google-pro" → Gemini Pro directly (free, no OpenRouter)
  // "openrouter" → GPT-4o via OpenRouter (requires credits)
  // "auto" → try Gemini first, then OpenAI direct, then OpenRouter as last resort

  const callOpenRouter = async (model: string) => {
    if (!openrouterKey) throw new HttpError(503, "OpenRouter API key not configured in Supabase secrets.");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": requestOrigin || "https://orbit.app",
        "X-Title": "Orbit AI",
      },
      body: JSON.stringify({ model, messages: orMessages, max_tokens: 4096, stream }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`OpenRouter failed (${res.status}): ${errText}`);
      if (res.status === 401) throw new HttpError(401, "OpenRouter authentication failed. Check OPENROUTER_API_KEY.");
      if (res.status === 402) throw new HttpError(402, "OpenRouter billing/credits required. Add credits at openrouter.ai or switch to Gemini.");
      if (res.status === 429) throw new HttpError(429, "Rate limit exceeded. Please retry shortly.");
      throw new HttpError(502, `OpenRouter error (${res.status})`);
    }
    return { response: res, provider: "openrouter", model };
  };

  const callOpenAIDirect = async () => {
    if (!openaiKey) throw new HttpError(503, "OpenAI API key not configured.");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", messages: orMessages, max_tokens: 4096, stream }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new HttpError(res.status, `OpenAI error (${res.status}): ${errText}`);
    }
    return { response: res, provider: "openai", model: "gpt-4o-mini" };
  };

  // ── Route by explicit provider ──
  if (providerId === "openrouter") {
    // Explicitly chose OpenRouter — use it directly, no fallback
    if (!openrouterKey) throw new HttpError(503, "OpenRouter key not configured. Add OPENROUTER_API_KEY to Supabase secrets.");
    return await callOpenRouter("openai/gpt-4o");
  }

  if (providerId === "google-pro") {
    if (!geminiKey) throw new HttpError(503, "GEMINI_API_KEY not configured in Supabase secrets.");
    return await callGemini(messages, "google-pro", stream, pdfDocuments);
  }

  if (providerId === "google") {
    if (!geminiKey) throw new HttpError(503, "GEMINI_API_KEY not configured in Supabase secrets.");
    return await callGemini(messages, "google", stream, pdfDocuments);
  }

  // ── Auto mode ("auto" or unrecognised providerId) ──
  // Try providers in order: Gemini Flash → OpenAI Direct → fail with clear message
  // Never auto-route to OpenRouter (costs credits)
  let lastError = "No AI providers configured.";

  if (geminiKey) {
    try {
      return await callGemini(messages, "google", stream, pdfDocuments);
    } catch (e: any) {
      lastError = e.message || "Gemini unavailable";
      console.warn("Auto: Gemini failed:", lastError);
    }
  }

  if (openaiKey) {
    try {
      return await callOpenAIDirect();
    } catch (e: any) {
      lastError = e.message || "OpenAI unavailable";
      console.warn("Auto: OpenAI failed:", lastError);
    }
  }

  throw new HttpError(503, `All AI providers failed. Last error: ${lastError}. Check your API keys in Supabase secrets.`);
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT and get authenticated user
    const { userId, error: authError } = await validateAuth(req);
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, providerId, pdfContext, pdfImages, ocrContext, mode, scanProgress, pdfDocuments } = await req.json();

    // Log for audit
    console.log(`AI chat request from user: ${userId}`);

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

    const requestOrigin = req.headers.get("origin") || req.headers.get("referer") || undefined;

    const { response, provider, model } = await callAI(
      aiMessages,
      providerId || "auto",
      pdfImages,
      true,
      requestOrigin,
      pdfDocuments,
    );

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

    let status = 500;
    let message = "AI chat failed";

    if (error instanceof HttpError) {
      status = error.status;
      message = error.message;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
