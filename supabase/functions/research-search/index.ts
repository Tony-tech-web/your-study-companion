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
      const geminiMessages = messages.filter(m => m.role !== "system").map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const systemInstruction = messages.find(m => m.role === "system");
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKeys.gemini}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
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

    // Use Serper API for web search
    if (serperApiKey) {
      try {
        // Search for academic/research content
        const searchResponse = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": serperApiKey,
          },
          body: JSON.stringify({
            q: `${query} research project academic`,
            num: 10,
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          // Process organic results
          if (searchData.organic) {
            searchResults = searchData.organic.map((item: any, index: number) => ({
              id: `result-${index}`,
              title: item.title,
              snippet: item.snippet,
              url: item.link,
              source: new URL(item.link).hostname.replace('www.', ''),
              position: item.position,
            }));
          }
        }
      } catch (e) {
        console.error("Serper search error:", e);
      }
    }

    // Generate AI insights and unique project ideas
    const aiMessages = [
      {
        role: "system",
        content: `You are an academic research advisor. Based on search results about a topic, provide:
1. Key insights and trends in this research area
2. 3-5 unique project ideas that haven't been widely explored
3. Potential gaps in current research

Return as JSON with this format:
{
  "insights": "Your analysis of the research landscape...",
  "projectIdeas": [
    {"title": "Project Title", "description": "Brief description", "uniqueness": "Why this is unique/underexplored"},
    ...
  ],
  "gaps": ["Gap 1", "Gap 2", ...]
}`
      },
      {
        role: "user",
        content: `Research topic: "${query}"

Search results summary:
${searchResults.slice(0, 5).map(r => `- ${r.title}: ${r.snippet}`).join('\n')}

Provide insights, unique project ideas, and research gaps.`
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
