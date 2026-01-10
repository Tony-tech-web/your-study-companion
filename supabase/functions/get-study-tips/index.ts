import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
          max_tokens: 2000,
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
          max_tokens: 2000,
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
          generationConfig: { maxOutputTokens: 2000 },
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, cgpa, activityStats } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gather user data for personalized tips
    let userGpa = cgpa;
    let userStats = activityStats;

    // Fetch GPA records if not provided
    if (!userGpa) {
      const { data: gpaRecords } = await supabase
        .from("gpa_records")
        .select("gpa")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (gpaRecords && gpaRecords.length > 0) {
        userGpa = gpaRecords[0].gpa;
      }
    }

    // Fetch user stats if not provided
    if (!userStats) {
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      userStats = stats || {};
    }

    // Fetch recent activity
    const { data: recentActivity } = await supabase
      .from("learning_activity")
      .select("activity_type, activity_count")
      .eq("user_id", userId)
      .gte("activity_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const activitySummary: Record<string, number> = {};
    recentActivity?.forEach(a => {
      activitySummary[a.activity_type] = (activitySummary[a.activity_type] || 0) + a.activity_count;
    });

    // Determine if student needs intervention
    const needsIntervention = userGpa && userGpa < 3.5;
    const isStrugglingBadly = userGpa && userGpa < 2.5;

    // Generate AI-powered personalized tips
    const messages = [
      {
        role: "system",
        content: `You are an academic advisor for university students. Generate personalized study tips and recommendations.
        
Return as JSON:
{
  "tips": [
    {"title": "Tip title", "description": "Detailed tip", "priority": "high|medium|low", "category": "study|time|focus|health"},
    ...
  ],
  "interventionMessage": "Special message if CGPA < 3.5 (null if not needed)",
  "weeklyGoals": ["Goal 1", "Goal 2", "Goal 3"],
  "motivationalMessage": "An encouraging message"
}`
      },
      {
        role: "user",
        content: `Student profile:
- Current CGPA: ${userGpa || "Not recorded"}
- Study streak: ${userStats?.current_streak || 0} days
- Total study hours: ${Math.floor((userStats?.total_study_minutes || 0) / 60)}
- AI interactions this week: ${activitySummary.ai_chat || 0}
- PDFs processed this week: ${activitySummary.pdf_upload || 0}
- Quizzes completed: ${activitySummary.quiz || 0}

${needsIntervention ? `IMPORTANT: This student has a CGPA below 3.5 (${userGpa}). Provide specific intervention strategies and extra support.` : ""}
${isStrugglingBadly ? `CRITICAL: CGPA is below 2.5. Focus on recovery strategies and fundamental study habits.` : ""}

Generate personalized tips, goals, and motivation for this student.`
      }
    ];

    let tips: any[] = [];
    let interventionMessage = null;
    let weeklyGoals: string[] = [];
    let motivationalMessage = "";

    const aiResponse = await callAI(messages, {
      openai: openaiApiKey,
      gemini: geminiApiKey,
      openrouter: openrouterApiKey,
    });

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          tips = parsed.tips || [];
          interventionMessage = parsed.interventionMessage;
          weeklyGoals = parsed.weeklyGoals || [];
          motivationalMessage = parsed.motivationalMessage || "";
        }
      } catch (e) {
        console.error("Failed to parse AI response:", e);
        // Fallback tips
        tips = [
          { title: "Review Notes Daily", description: "Spend 15-30 minutes reviewing today's notes before bed.", priority: "high", category: "study" },
          { title: "Active Recall Practice", description: "Test yourself instead of just re-reading. Use flashcards.", priority: "high", category: "study" },
          { title: "Take Regular Breaks", description: "Use the Pomodoro technique: 25 min work, 5 min break.", priority: "medium", category: "focus" },
        ];
        motivationalMessage = "Keep pushing forward! Every study session brings you closer to your goals.";
      }
    } else {
      tips = [
        { title: "Review Notes Daily", description: "Spend 15-30 minutes reviewing today's notes before bed.", priority: "high", category: "study" },
        { title: "Active Recall Practice", description: "Test yourself instead of just re-reading. Use flashcards.", priority: "high", category: "study" },
        { title: "Take Regular Breaks", description: "Use the Pomodoro technique: 25 min work, 5 min break.", priority: "medium", category: "focus" },
      ];
      motivationalMessage = "Keep pushing forward! Every study session brings you closer to your goals.";
    }

    return new Response(
      JSON.stringify({
        success: true,
        tips,
        interventionMessage,
        weeklyGoals,
        motivationalMessage,
        needsIntervention,
        currentCgpa: userGpa,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("get-study-tips error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to generate tips" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
