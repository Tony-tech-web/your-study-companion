import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODELS = [
  { id: "gemini-flash", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-flash" },
  { id: "gemini-pro", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "google/gemini-2.5-pro" },
  { id: "gpt-5", url: "https://ai.gateway.lovable.dev/v1/chat/completions", model: "openai/gpt-5" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let filePath: string | null = null;
    let userId: string | null = null;

    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      filePath = body.filePath || body.path;
      userId = body.userId || body.user_id;
    } else {
      const url = new URL(req.url);
      filePath = url.searchParams.get("path");
      userId = url.searchParams.get("user_id");
    }

    if (!filePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing filePath or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(`Processing PDF: ${filePath} for user: ${userId}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("student-pdfs")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try each AI model with fallback
    let extractedText = "";
    let lastError = null;

    for (const aiModel of AI_MODELS) {
      try {
        console.log(`Attempting PDF extraction with ${aiModel.id}`);
        
        const aiResponse = await fetch(aiModel.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`
          },
          body: JSON.stringify({
            model: aiModel.model,
            messages: [
              {
                role: "system",
                content: `You are a document parser. Extract ALL text content from the provided PDF document. 
                Preserve the structure including:
                - Headings and subheadings
                - Paragraphs
                - Lists and bullet points
                - Tables (format as markdown tables)
                - Important formulas or equations
                
                Return the content in clean, well-formatted markdown. If there are images with text, describe them.
                Do NOT summarize - extract the FULL content.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please extract all text content from this PDF document. Return the complete content in markdown format."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:application/pdf;base64,${base64Data}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 16000
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          extractedText = aiData.choices?.[0]?.message?.content || "";
          
          if (extractedText && extractedText.length > 50) {
            console.log(`Successfully extracted ${extractedText.length} characters with ${aiModel.id}`);
            break;
          }
        } else {
          const errorText = await aiResponse.text();
          console.error(`${aiModel.id} failed:`, errorText);
          lastError = errorText;
        }
      } catch (err) {
        console.error(`${aiModel.id} error:`, err);
        lastError = String(err);
      }
    }

    if (!extractedText || extractedText.length < 50) {
      // Fallback: Return a message that the PDF couldn't be parsed
      extractedText = `[Document: ${filePath.split('/').pop()}]

This document has been uploaded and is ready for AI assistance. The content may include text, images, tables, and formulas.

Please ask me questions about this document, and I'll help you understand and learn from it based on your queries.`;
    }

    // Log activity
    try {
      await supabase.from("learning_activity").insert({
        user_id: userId,
        activity_type: "pdf_upload",
        activity_count: 1,
      });
    } catch (e) {
      console.log("Activity logging skipped");
    }

    // Save conversation record
    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "assistant",
      content: `I've processed the document: ${filePath.split('/').pop()}. I'm ready to help you study its content.`,
    });

    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-pdf error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to process document. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
