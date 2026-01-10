import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AI Models with fallback - Try OpenAI first, then Gemini
async function callAI(messages: any[], apiKeys: { openai?: string; gemini?: string; openrouter?: string }) {
  const errors: string[] = [];
  
  // Try OpenRouter first (if configured)
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
          max_tokens: 8000,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      errors.push(`OpenRouter: ${res.status}`);
    } catch (e) {
      errors.push(`OpenRouter: ${e}`);
    }
  }
  
  // Try OpenAI directly
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
          max_tokens: 8000,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      errors.push(`OpenAI: ${res.status}`);
    } catch (e) {
      errors.push(`OpenAI: ${e}`);
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
          generationConfig: { maxOutputTokens: 8000 },
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
      errors.push(`Gemini: ${res.status}`);
    } catch (e) {
      errors.push(`Gemini: ${e}`);
    }
  }
  
  throw new Error(`All AI providers failed: ${errors.join(", ")}`);
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

    const { userId, materialId, pdfContent, toolType, studyFocus } = await req.json();

    if (!userId || !pdfContent || !toolType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (toolType) {
      case "notes":
        systemPrompt = `You are an expert study notes generator. Create comprehensive, well-organized study notes from the provided content.`;
        userPrompt = `Create detailed study notes from this content. ${studyFocus ? `Focus on: ${studyFocus}` : 'Cover all topics comprehensively.'}

Include:
- Clear headings and subheadings
- Key definitions and concepts
- Important formulas or equations (if any)
- Summary points for each section
- Connection between related topics

Content:
${pdfContent.substring(0, 30000)}`;
        break;

      case "flashcards":
        systemPrompt = `You are an expert flashcard creator. Generate effective flashcards for studying and memorization. Return ONLY a JSON array with no additional text.`;
        userPrompt = `Create flashcards from this content. ${studyFocus ? `Focus on: ${studyFocus}` : ''}

Return ONLY a valid JSON array with this exact format (no markdown, no explanation):
[
  {"front": "Question or term", "back": "Answer or definition"},
  ...
]

Generate 15-25 flashcards covering key concepts, definitions, formulas, and important facts.

Content:
${pdfContent.substring(0, 30000)}`;
        break;

      case "quiz":
        systemPrompt = `You are an expert quiz generator. Create challenging but fair quiz questions to test understanding. Return ONLY a JSON array with no additional text.`;
        userPrompt = `Create a quiz from this content. ${studyFocus ? `Focus on: ${studyFocus}` : ''}

Return ONLY a valid JSON array with this exact format (no markdown, no explanation):
[
  {
    "question": "Question text",
    "type": "multiple_choice",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "The correct answer",
    "explanation": "Brief explanation"
  },
  ...
]

Generate 10-15 questions of varying difficulty.

Content:
${pdfContent.substring(0, 30000)}`;
        break;

      case "summary":
        systemPrompt = `You are an expert summarizer. Create concise but comprehensive summaries.`;
        userPrompt = `Summarize this content. ${studyFocus ? `Focus on: ${studyFocus}` : ''}

Provide:
1. Executive summary (2-3 sentences)
2. Key points (bullet list)
3. Main concepts explained
4. Important takeaways

Content:
${pdfContent.substring(0, 30000)}`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid tool type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const generatedContent = await callAI(messages, {
      openai: openaiApiKey,
      gemini: geminiApiKey,
      openrouter: openrouterApiKey,
    });

    // Parse JSON for flashcards and quiz
    let parsedContent = generatedContent;
    if (toolType === "flashcards" || toolType === "quiz") {
      try {
        const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log("JSON parsing failed, returning raw content");
        parsedContent = generatedContent;
      }
    }

    // Update course material with generated tools
    if (materialId) {
      const { data: existing } = await supabase
        .from("course_materials")
        .select("study_tools")
        .eq("id", materialId)
        .single();

      const existingTools = existing?.study_tools || {};
      const updatedTools = {
        ...existingTools,
        [toolType]: {
          content: parsedContent,
          generated_at: new Date().toISOString(),
        }
      };

      await supabase
        .from("course_materials")
        .update({ study_tools: updatedTools, is_processed: true })
        .eq("id", materialId);
    }

    // Log activity
    try {
      await supabase.from("learning_activity").insert({
        user_id: userId,
        activity_type: toolType === "quiz" ? "quiz" : "flashcard",
        activity_count: 1,
      });
    } catch (e) {
      console.log("Activity logging skipped");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: parsedContent,
        toolType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("generate-study-tools error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to generate study tools" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
