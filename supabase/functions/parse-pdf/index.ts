import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse@1.1.1";

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

    // Support both search params (user style) and JSON body (frontend style)
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
        JSON.stringify({ error: "Failed to download PDF", details: downloadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse PDF using pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    // @ts-ignore: pdf-parse expects a Buffer but works with Uint8Array in Deno
    const pdfData = await pdf(new Uint8Array(arrayBuffer));
    const extractedText = pdfData.text || "";

    console.info(`Successfully extracted ${extractedText.length} characters`);

    // Log to ai_conversations as per user requirement
    // Note: We use the service key to bypass RLS if needed, or the client will use it
    await supabase.from("ai_conversations").insert({
      user_id: userId,
      role: "assistant",
      content: `I've successfully processed the document: ${filePath.split('/').pop()}. I am ready to help you study its content.`,
    });

    // Return the text to the frontend so the "Analyzing PDF..." state can finish
    return new Response(
      JSON.stringify({ text: extractedText }),
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
