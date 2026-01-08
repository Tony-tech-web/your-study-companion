import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 1. Helper for Year Extraction and Sanitization
const cleanText = (text: string) => text.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, 500);

const extractYear = (info: string) => {
  const yearMatch = info?.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : "n.d.";
};

// 2. The Robust Scholar Function
async function performScholarSearch(query: string, retries = 1) {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return { promptString: "Research unavailable (API Key missing).", citations: [] };

  // Use AbortSignal.timeout for a 10-second wall-clock timeout
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
        if (response.status === 429 || response.status >= 500) continue; // Retry transient errors
        throw new Error(`Serper Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Structure the data for both the AI and the UI
      const results = (data.organic || []).map((paper: any, index: number) => ({
        id: `ref-${index + 1}`,
        title: paper.title,
        authors: paper.publicationInfo || "Unknown Authors",
        year: extractYear(paper.publicationInfo),
        snippet: cleanText(paper.snippet),
        link: paper.link,
      }));

      // Create a formatted string for the AI's system prompt
      const promptString = results.map(r => 
        `[${r.id}] ${r.title} (${r.year})\nSource: ${r.authors}\nSnippet: ${r.snippet}`
      ).join("\n\n");

      return { promptString, citations: results };

    } catch (err) {
      if (attempt === retries) {
        console.error("Scholar search failed after retries:", err);
        return { promptString: "Search currently unavailable.", citations: [] };
      }
      // Brief wait before retry (200ms)
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Models with automatic fallback - OpenAI primary, OpenRouter & Gemini fallback
const AI_MODELS = [
  { 
    id: "gpt-4o", 
    name: "GPT-4o (Standard)", 
    model: "gpt-4o", 
    priority: 1,
    provider: "openai",
    url: "https://api.openai.com/v1/chat/completions"
  },
  { 
    id: "gpt-4o-mini", 
    name: "GPT-4o Mini", 
    model: "gpt-4o-mini", 
    priority: 2,
    provider: "openai",
    url: "https://api.openai.com/v1/chat/completions"
  },
  { 
    id: "openrouter-gpt4", 
    name: "OpenRouter GPT-4", 
    model: "openai/gpt-4o", // Updated to 4o
    priority: 3,
    provider: "openrouter",
    url: "https://openrouter.ai/api/v1/chat/completions"
  },
  { 
    id: "gemini-flash", 
    name: "Gemini 1.5 Flash", 
    model: "gemini-1.5-flash", 
    priority: 4,
    provider: "gemini",
    url: "https://generativelanguage.googleapis.com/v1beta/models"
  }
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
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { messages, user_id, message, pdfContext, pdfImages, mode = "chat", providerId } = body;

    console.log(`[DEBUG] Request mode: ${mode}, user_id: ${user_id}, keys: {openai:${!!openaiApiKey}, gemini:${!!geminiApiKey}, openrouter:${!!openrouterApiKey}, serper:${!!serperApiKey}}`);

    // --- High Fidelity OCR Optimization (Google Vision) ---
    let ocrContext = "";
    if (pdfImages && pdfImages.length > 0 && geminiApiKey) {
      // ULTRA-LEAN CAP: Only OCR 5 pages per request to fit 13k limit
      const imagesToOCR = pdfImages.slice(0, 5);
      console.info(`Performing Google Vision OCR on ${imagesToOCR.length} images...`);
      try {
        const ocrResults = await Promise.all(imagesToOCR.map(async (imgData: string, idx: number) => {
          try {
            const [header, base64] = imgData.split(',');
            const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${geminiApiKey}`;
            const response = await fetch(visionUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [{
                  image: { content: base64 },
                  features: [{ type: "TEXT_DETECTION" }]
                }]
              })
            });
            const data = await response.json();
            const text = data.responses?.[0]?.fullTextAnnotation?.text || "";
            return text ? `[OCR Page ${idx + 1}]\n${text}` : "";
          } catch (e) {
            console.error(`OCR Error for page ${idx + 1}:`, e);
            return "";
          }
        }));
        ocrContext = ocrResults.filter(t => t).join("\n\n");
        console.info(`OCR completed. Extracted ${ocrContext.length} characters.`);
      } catch (err) {
        console.error("Global OCR Error:", err);
      }
    }

    // --- STATUS CHECK MODE ---
    if (mode === "status") {
      const services = [
        {
          id: "openai",
          name: "OpenAI",
          status: openaiApiKey ? "active" : "inactive",
          purpose: "Primary AI chat (GPT-4o, GPT-4 Turbo, GPT-3.5)",
          credits: openaiApiKey ? "Configured" : "Not configured"
        },
        {
          id: "openrouter",
          name: "OpenRouter",
          status: openrouterApiKey ? "active" : "inactive",
          purpose: "Backup AI provider (Multiple models)",
          credits: openrouterApiKey ? "Configured" : "Not configured"
        },
        {
          id: "gemini",
          name: "Google Gemini",
          status: geminiApiKey ? "active" : "inactive",
          purpose: "Fallback AI provider (Gemini Flash & Pro)",
          credits: geminiApiKey ? "Configured" : "Not configured"
        },
        {
          id: "serper",
          name: "Serper API",
          status: serperApiKey ? "active" : "inactive",
          purpose: "Web search capabilities",
          credits: serperApiKey ? "Configured" : "Not configured"
        }
      ];
      
      return new Response(JSON.stringify({ services }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user_id || body.userId;
    const currentMessage = message || (messages && messages[messages.length - 1]?.content);

    if (!userId || !currentMessage) {
      console.error("Missing user_id or message", { userId, currentMessage });
      return new Response(
        JSON.stringify({ error: "Missing user_id or message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const citations: any[] = [];

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
    
    // --- RESEARCH MODE FAST-PATH ---
    if (mode === "research" && currentMessage) {
      console.info("Entering research mode for:", currentMessage);
      const { promptString, citations: searchCitations } = await performScholarSearch(currentMessage);
      
      // We don't need the AI to summarize for the list view, just return citations
      return new Response(
        JSON.stringify({ 
          text: "Research results retrieved.", 
          citations: searchCitations 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pdfContext || ocrContext) {
      const scanInfo = body.scanProgress ? `\n[SCAN STATUS: Page ${body.scanProgress.current} of ${body.scanProgress.total}]` : "";
      
      // AGGRESSIVE CONTEXT SLICING: Slice the full text for the current 5-page batch
      let relevantText = pdfContext || "";
      if (body.scanProgress) {
        const startMarker = `[Page ${body.scanProgress.current - 4}]`;
        const endMarker = `[Page ${body.scanProgress.current + 1}]`;
        const startIdx = relevantText.indexOf(startMarker);
        const endIdx = relevantText.indexOf(endMarker);
        
        if (startIdx !== -1) {
          relevantText = relevantText.substring(startIdx, endIdx !== -1 ? endIdx : undefined);
        }
      }
      
      // ULTRA-LEAN CAP: 2,500 characters to fit 13k token limit
      relevantText = relevantText.substring(0, 2500);

      systemPrompt += `\n\n[CRITICAL: DOCUMENT CONTENT ATTACHED]${scanInfo}
The user has uploaded a PDF document. You are currently in a BATCHED SCANNING MODE.

${ocrContext ? `--- CURRENT BATCH HIGH-FIDELITY OCR (Pages ${body.scanProgress?.current - 4 || 1} to ${body.scanProgress?.current || 5}) ---
${ocrContext}
---------------------------------` : ""}

${relevantText ? `--- CURRENT BATCH TEXT EXTRACT ---
${relevantText}
---------------------------------` : ""}

INSTRUCTIONS FOR BATCHED SCANNING:
1. FOCUS: Primarily discuss the content from the "CURRENT BATCH" provided above.
2. LIMIT: Do NOT summarize the entire document at once. Stay focused on the current chunk to keep the teaching manageable.
3. COMMAND: At the end of your explanation, if there are more pages left (${body.scanProgress?.current < body.scanProgress?.total}), you MUST ask: "Would you like me to scan the next 5 pages?"
4. COMPLETION: If you have reached the end of the document (${body.scanProgress?.current >= body.scanProgress?.total}), tell the user: "We have finished scanning the document! Would you like to switch to the 'Test' tab so I can quiz you on what we've learned?"`;
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
      const mapping: Record<string, string> = {
        'google': 'gemini-flash',
        'google-pro': 'gemini-pro',
        'openrouter': 'openrouter-gpt4'
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
    let modelsAttempted = 0;

    for (const aiModel of modelsToTry) {
      try {
        let apiKey: string | undefined;
        let requestBody: any;
        let requestUrl: string;
        
        if (aiModel.provider === "openai" || aiModel.provider === "openrouter") {
          apiKey = (aiModel.provider === "openai") ? openaiApiKey : openrouterApiKey;
          if (!apiKey) continue;
          
          let messagesToSubmit = [...chatMessages];
          if (pdfImages && pdfImages.length > 0) {
            // Find the last user message to attach images to
            const lastUserIdx = messagesToSubmit.map(m => m.role).lastIndexOf("user");
            if (lastUserIdx !== -1) {
              const content: any[] = [{ type: "text", text: messagesToSubmit[lastUserIdx].content }];
              // CAP: Only send the first 10 images to avoid context overflow
              pdfImages.slice(0, 10).forEach(img => {
                content.push({ type: "image_url", image_url: { url: img } });
              });
              messagesToSubmit[lastUserIdx] = { ...messagesToSubmit[lastUserIdx], content };
            }
          }

          requestUrl = aiModel.url;
          requestBody = {
            model: aiModel.model,
            messages: messagesToSubmit,
            stream: true,
            temperature: 0.7,
            max_tokens: 1000,
          };
        } else if (aiModel.provider === "gemini") {
          apiKey = geminiApiKey;
          if (!apiKey) continue;
          
          // Gemini native URL construction
          requestUrl = `${aiModel.url}/${aiModel.model}:generateContent?key=${apiKey}`;
          
<<<<<<< HEAD
          // Convert OpenAI format to Gemini format.
          // Gemini REST API does not accept a "system" role, and the previous
          // "systemInstruction" field is currently rejected by the endpoint.
          // To stay compatible, we merge the system prompt into the first user message.
          const systemPromptText = chatMessages.find(m => m.role === "system")?.content;
          const nonSystemMessages = chatMessages.filter(m => m.role !== "system");

          const mergedMessages = [...nonSystemMessages];
          if (systemPromptText) {
            if (mergedMessages.length === 0) {
              mergedMessages.push({ role: "user", content: String(systemPromptText) });
            } else if (mergedMessages[0].role === "user") {
              mergedMessages[0] = {
                ...mergedMessages[0],
                content: `${systemPromptText}\n\n${mergedMessages[0].content}`.trim(),
              };
            } else {
              mergedMessages.unshift({ role: "user", content: String(systemPromptText) });
            }
          }

          const geminiContents = mergedMessages.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: String(m.content) }]
          }));

=======
          // Convert OpenAI format to Gemini format
          const geminiContents = chatMessages
            .filter(m => m.role !== "system")
            .map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: String(m.content).trim() }]
            }));
          
          // Add system prompt to first user message context for Gemini
          const systemMsg = chatMessages.find(m => m.role === "system");
          if (systemMsg && geminiContents.length > 0) {
            const firstUserMsg = geminiContents.find(c => c.role === "user");
            if (firstUserMsg) {
              firstUserMsg.parts[0].text = `System Instructions: ${systemMsg.content}\n\nUser Message: ${firstUserMsg.parts[0].text}`;
              
              // Add images to this first user message
              if (pdfImages && pdfImages.length > 0) {
                // CAP: Only send the first 10 images to avoid context overflow
                pdfImages.slice(0, 10).forEach(imgData => {
                  const [header, base64] = imgData.split(',');
                  const mimeType = header.split(':')[1].split(';')[0];
                  firstUserMsg.parts.push({
                    inline_data: {
                      mime_type: mimeType,
                      data: base64
                    }
                  } as any);
                });
              }
            }
          }
          
>>>>>>> 6a0461f (ai is finally working with reasarech and pdf)
          requestBody = {
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
<<<<<<< HEAD
              maxOutputTokens: 2048, // Reduced for faster response
            },
=======
              maxOutputTokens: 2048,
            }
>>>>>>> 6a0461f (ai is finally working with reasarech and pdf)
          };
        } else {
          continue;
        }

        console.info(`Attempting ${aiModel.name} (${aiModel.model})...`);
        modelsAttempted++;
        
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        
        if (aiModel.provider === "openai" || aiModel.provider === "openrouter") {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
        
        const res = await fetch(requestUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (res.ok) {
          // ... successful response handling ...
          let stream;
          if (aiModel.provider === "gemini") {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const encoder = new TextEncoder();
            stream = new ReadableStream({
              start(controller) {
                const openaiChunk = { choices: [{ delta: { content: text }, index: 0 }] };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              }
            });
          }

          const responseHeaders = new Headers();
          Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value as string);
          });
          responseHeaders.set("x-citations", JSON.stringify(citations || []));
          responseHeaders.set("Access-Control-Expose-Headers", "x-citations");

          if (aiModel.provider === "gemini") {
            successfulResponse = new Response(stream, {
              headers: {
                ...Object.fromEntries(responseHeaders.entries()),
                "Content-Type": "text/event-stream"
              }
            });
          } else {
            const finalHeaders = new Headers(res.headers);
            responseHeaders.forEach((value, key) => finalHeaders.set(key, value));
            successfulResponse = new Response(res.body, {
              status: res.status,
              statusText: res.statusText,
              headers: finalHeaders
            });
          }
          console.info(`✓ Success with ${aiModel.name}`);
          break;
        } else {
          const errorText = await res.text();
          console.error(`✗ ${aiModel.name} failed (${res.status}):`, errorText);
          lastError = `${aiModel.name} (${res.status}): ${errorText}`;
          if (res.status === 429 || res.status >= 500) continue;
        }
      } catch (err) {
        console.error(`✗ ${aiModel.name} exception:`, err);
        lastError = `${aiModel.name} exception: ${String(err)}`;
      }
    }

    if (!successfulResponse) {
      const diagnostics = {
        modelsToTry: modelsToTry.map(m => m.name),
        modelsAttempted,
        openaiKey: !!openaiApiKey,
        geminiKey: !!geminiApiKey,
        openrouterKey: !!openrouterApiKey,
        serperKey: !!serperApiKey,
        lastAttemptedModel: modelsToTry[modelsAttempted - 1]?.name || "none"
      };

      const errorMsg = modelsAttempted === 0 
        ? "No AI services are configured. Check your Supabase secrets."
        : "All AI services failed to respond.";
      
      console.error(`Final failure: ${errorMsg}`, diagnostics, `Last error: ${lastError}`);
      
      return new Response(
        JSON.stringify({ 
          error: errorMsg, 
          details: lastError,
          diagnostics
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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