
// 1. Helper for Year Extraction and Sanitization
const cleanText = (text: string) => text.replace(/[\x00-\x1F\x7F-\x9F]/g, "").substring(0, 500);

const extractYear = (info: string) => {
  const yearMatch = info?.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : "n.d.";
};

// 2. Helper for General Web Search
export async function performWebSearch(query: string) {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return "";

  // Use AbortSignal.timeout for a 5-second wall-clock timeout for search
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
    return snippets ? `\n\n--- WEB SEARCH CONTEXT (FOR FURTHER EXPLANATION) ---\n${snippets}\n-------------------------` : "";
  } catch (e) {
    console.error("Web search failed or timed out:", e);
    return "";
  }
}

// 2. The Robust Scholar Function
export async function performScholarSearch(query: string, retries = 1) {
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

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Models with automatic fallback - OpenAI primary, OpenRouter & Gemini fallback
export const AI_MODELS = [
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

