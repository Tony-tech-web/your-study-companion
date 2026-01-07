import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
        systemPrompt = `You are an expert flashcard creator. Generate effective flashcards for studying and memorization.`;
        userPrompt = `Create flashcards from this content. ${studyFocus ? `Focus on: ${studyFocus}` : ''}

Return as a JSON array with this format:
[
  {"front": "Question or term", "back": "Answer or definition"},
  ...
]

Generate 15-25 flashcards covering key concepts, definitions, formulas, and important facts.

Content:
${pdfContent.substring(0, 30000)}`;
        break;

      case "quiz":
        systemPrompt = `You are an expert quiz generator. Create challenging but fair quiz questions to test understanding.`;
        userPrompt = `Create a quiz from this content. ${studyFocus ? `Focus on: ${studyFocus}` : ''}

Return as a JSON array with this format:
[
  {
    "question": "Question text",
    "type": "multiple_choice" | "true_false" | "short_answer",
    "options": ["A", "B", "C", "D"] (for multiple choice only),
    "correct_answer": "The correct answer",
    "explanation": "Brief explanation of why this is correct"
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

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI generation failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate study tools" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON for flashcards and quiz
    let parsedContent = generatedContent;
    if (toolType === "flashcards" || toolType === "quiz") {
      try {
        // Extract JSON from the response
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
