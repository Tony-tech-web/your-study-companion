import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    console.info(`Processing PDF with OpenAI: ${filePath} for user: ${userId}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("student-pdfs")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: downloadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract text using pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let rawText = "";
    try {
        const data = await pdf(buffer);
        rawText = data.text;
        if (!rawText || rawText.trim().length === 0) {
            rawText = "[This appears to be a scanned document or image-based PDF. The text could not be directly read.]";
        }
    } catch (parseError) {
        console.error("PDF Scan Error (non-fatal):", parseError);
        rawText = "[Error reading document structure. It might be corrupted or encrypted.]";
    }

    // Clean and Structure with OpenAI
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that scans and reads content from PDFs. Your goal is to return the content in a clean, readable markdown format. If the text seems like a scanned error message, explain that to the user politely."
          },
          {
            role: "user",
            content: `Here is the raw text extracted from a PDF. Please clean it up and return ONLY the cleaned text content.\n\n${rawText.substring(0, 100000)}` // Slice to avoid context limits if huge
          }
        ]
      })
    });

    if (!openAiResponse.ok) {
        const err = await openAiResponse.text();
        console.error("OpenAI Error:", err);
        // Fallback to raw text if OpenAI fails
        return new Response(
            JSON.stringify({ text: rawText, warning: "OpenAI processing failed, returning raw text." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const aiData = await openAiResponse.json();
    const cleanedText = aiData.choices?.[0]?.message?.content || rawText;

    console.info(`Successfully processed text with OpenAI`);

    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "assistant",
      content: `I've successfully processed the document: ${filePath.split('/').pop()} using OpenAI. I am ready to help you study its content.`,
    });

    return new Response(
      JSON.stringify({ text: cleanedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
