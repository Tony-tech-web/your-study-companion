import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI call helper with fallback
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
          model: "google/gemini-2.0-flash-001",
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
  
  // Try Gemini
  if (apiKeys.gemini) {
    try {
      const systemPromptText = messages.find((m: any) => m.role === "system")?.content;
      const nonSystem = messages.filter((m: any) => m.role !== "system");

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

      const geminiMessages = merged.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKeys.gemini}`, {
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
          model: "gpt-4o-mini",
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

    const { query, userId, searchMode = 'academic' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing search query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let searchResults: any[] = [];

    // Use Serper API for web search
    if (serperApiKey) {
      try {
        const searchQueries: string[] = [];
        
        if (searchMode === 'projects') {
          // Computer Science / Technical project search
          searchQueries.push(
            `${query} github project repository`,
            `${query} implementation source code`
          );
        } else {
          // Academic / General research search
          searchQueries.push(
            `${query} research paper study`,
            `${query} academic journal article`
          );
        }

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

        // Also search Google Scholar for academic mode
        if (searchMode === 'academic') {
          try {
            const scholarResponse = await fetch("https://google.serper.dev/scholar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-KEY": serperApiKey,
              },
              body: JSON.stringify({ q: query, num: 5 }),
            });

            if (scholarResponse.ok) {
              const scholarData = await scholarResponse.json();
              if (scholarData.organic) {
                const scholarResults = scholarData.organic.map((item: any, index: number) => ({
                  id: `scholar-${index}`,
                  title: item.title,
                  snippet: item.snippet || item.publicationInfo || '',
                  url: item.link,
                  source: 'Google Scholar',
                  isGitHub: false,
                }));
                searchResults.push(...scholarResults);
              }
            }
          } catch (e) {
            console.log("Scholar search skipped:", e);
          }
        }

        // Deduplicate by URL
        const seen = new Set();
        searchResults = searchResults.filter(r => {
          if (seen.has(r.url)) return false;
          seen.add(r.url);
          return true;
        });

        // Sort: GitHub first for projects, Scholar first for academic
        if (searchMode === 'projects') {
          searchResults.sort((a, b) => {
            if (a.isGitHub && !b.isGitHub) return -1;
            if (!a.isGitHub && b.isGitHub) return 1;
            return 0;
          });
        } else {
          searchResults.sort((a, b) => {
            if (a.source === 'Google Scholar' && b.source !== 'Google Scholar') return -1;
            if (a.source !== 'Google Scholar' && b.source === 'Google Scholar') return 1;
            return 0;
          });
        }

        searchResults = searchResults.slice(0, 12);
      } catch (e) {
        console.error("Serper search error:", e);
      }
    }

    // Generate AI insights based on search mode
    let aiInsights = "";
    let projectIdeas: any[] = [];
    let existingProjects: string[] = [];
    let gaps: string[] = [];
    let relatedTopics: string[] = [];

    const systemPrompt = searchMode === 'projects' 
      ? `You are a technical research assistant helping students find EXISTING projects and implementations. Based on the search results, provide:
1. A summary of the existing projects/implementations found
2. Key features and technologies used
3. Suggestions for how to improve or build upon these solutions
4. Related topics to explore

Return as JSON:
{
  "insights": "Summary of existing projects...",
  "projectIdeas": [{"title": "Enhancement Idea", "description": "How to improve", "basedOn": "Which project"}],
  "existingProjects": ["Project 1", "Project 2"],
  "gaps": ["What's missing in current solutions"],
  "relatedTopics": ["Topic 1", "Topic 2"]
}`
      : `You are an academic research assistant helping students explore research topics across ALL disciplines (not just computer science). Based on the search results, provide:
1. A comprehensive summary of the research landscape
2. Key findings and methodologies
3. Research gaps and opportunities
4. Suggestions for original research directions

Return as JSON:
{
  "insights": "Summary of research findings...",
  "projectIdeas": [{"title": "Research Direction", "description": "Potential study approach"}],
  "gaps": ["Unexplored areas", "Methodological gaps"],
  "relatedTopics": ["Related field 1", "Interdisciplinary connection"]
}`;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Research topic: "${query}"
Mode: ${searchMode === 'projects' ? 'Technical/Project Search' : 'Academic Research'}

Search results found:
${searchResults.slice(0, 8).map(r => `- ${r.title} (${r.source}): ${r.snippet}`).join('\n')}

Analyze these results and provide insights.`
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
          existingProjects = parsed.existingProjects || [];
          gaps = parsed.gaps || [];
          relatedTopics = parsed.relatedTopics || [];
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
        projectIdeas,
        existingProjects,
        gaps,
        relatedTopics,
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
