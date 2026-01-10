import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI call helper for insights and project ideas
async function callAI(messages: any[], apiKeys: { openai?: string; gemini?: string; openrouter?: string }) {
  // Try OpenRouter first
  if (apiKeys.openrouter) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.openrouter}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-4-turbo",
          messages,
          max_tokens: 4000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("OpenRouter error:", e);
    }
  }
  
  // Try OpenAI
  if (apiKeys.openai) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKeys.openai}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages,
          max_tokens: 4000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } catch (e) {
      console.error("OpenAI error:", e);
    }
  }
  
  // Try Gemini
  if (apiKeys.gemini) {
    try {
      const systemPromptText = messages.find(m => m.role === "system")?.content;
      const nonSystem = messages.filter(m => m.role !== "system");

      const merged = [...nonSystem];
      if (systemPromptText) {
        if (merged.length === 0) {
          merged.push({ role: "user", content: String(systemPromptText) });
        } else if (merged[0].role === "user") {
          merged[0] = { ...merged[0], content: `${systemPromptText}\n\n${merged[0].content}`.trim() };
        } else {
          merged.unshift({ role: "user", content: String(systemPromptText) });
        }
      }

      const geminiMessages = merged.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKeys.gemini}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 4000 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch (e) {
      console.error("Gemini error:", e);
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serperApiKey = Deno.env.get("SERPER_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query, userId } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing search query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let searchResults: any[] = [];
    let aiInsights = "";
    let projectIdeas: any[] = [];

    // Use Serper API for web search - search for EXISTING projects
    if (serperApiKey) {
      try {
        // Search specifically for existing projects on GitHub, research papers, and implementations
        const searchQueries = [
          `${query} github project repository`,
          `${query} research paper implementation`,
        ];

        for (const searchQuery of searchQueries) {
          const searchResponse = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": serperApiKey,
            },
            body: JSON.stringify({
              q: searchQuery,
              num: 8,
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            
            // Process organic results
            if (searchData.organic) {
              const newResults = searchData.organic.map((item: any, index: number) => ({
                id: `result-${searchResults.length + index}`,
                title: item.title,
                snippet: item.snippet,
                url: item.link,
                source: new URL(item.link).hostname.replace('www.', ''),
                position: item.position,
                isGitHub: item.link.includes('github.com'),
              }));
              searchResults.push(...newResults);
            }
          }
        }

        // Deduplicate by URL
        const seen = new Set();
        searchResults = searchResults.filter(r => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });

        // Prioritize GitHub results
        searchResults.sort((a, b) => {
          if (a.isGitHub && !b.isGitHub) return -1;
          if (!a.isGitHub && b.isGitHub) return 1;
          return 0;
        });

        searchResults = searchResults.slice(0, 12);
      } catch (e) {
        console.error("Serper search error:", e);
      }
    }

    // Generate AI insights focusing on EXISTING projects found
    const aiMessages = [
      {
        role: "system",
        content: `You are a research assistant that helps students find EXISTING projects and implementations. Based on the search results, provide:
1. A summary of the existing projects found
2. Key features and approaches used in these projects
3. Suggestions for how to build upon or improve these existing solutions

Return as JSON with this format:
{
  "insights": "Summary of existing projects found...",
  "projectIdeas": [
    {"title": "Enhancement Idea", "description": "How to improve on existing work", "basedOn": "Which existing project this builds upon"},
    ...
  ],
  "existingProjects": ["Project 1 name", "Project 2 name", ...],
  "gaps": ["What's missing in current solutions", ...]
}`
      },
      {
        role: "user",
        content: `Research topic: "${query}"

Existing projects and implementations found:
${searchResults.slice(0, 8).map(r => `- ${r.title} (${r.source}): ${r.snippet}`).join('\n')}

Analyze these existing projects and provide insights on what has been built and how to improve upon them.`
      }
    ];

    const aiResponse = await callAI(aiMessages, {
      openai: openaiApiKey,
      gemini: geminiApiKey,
      openrouter: openrouterApiKey,
    });

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          aiInsights = parsed.insights || "";
          projectIdeas = parsed.projectIdeas || [];
        }
      } catch (e) {
        aiInsights = aiResponse;
      }
    }

    // Log activity and save to research history
    if (userId) {
      try {
        await supabase.from("learning_activity").insert({
          user_id: userId,
          activity_type: "research",
          activity_count: 1,
        });

        await supabase.from("research_history").insert({
          user_id: userId,
          query: query,
          results: searchResults,
          ai_summary: aiInsights,
        });
      } catch (e) {
        console.log("Activity logging skipped");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: searchResults,
        insights: aiInsights,
        projectIdeas: projectIdeas,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("research-search error:", e);
    return new Response(
      JSON.stringify({ error: "Research search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
