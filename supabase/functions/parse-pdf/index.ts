import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const filePath = body.filePath || body.path;
    const userId = body.userId || body.user_id;

    if (!filePath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing filePath or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.info(`Processing PDF: ${filePath}`);

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

    console.info(`PDF downloaded successfully, size: ${fileData.size} bytes`);

    // Note: PDF text extraction is now done client-side with pdfjs-dist
    // This function serves as a backup for server-side processing if needed
    
    let extractedText = "";
    
    // For now, return a message indicating the PDF was received
    // The actual text extraction happens client-side in usePdfLibrary.ts
    extractedText = `[DOCUMENT: ${filePath.split('/').pop()}]

This PDF has been uploaded successfully. Text extraction is being processed client-side for optimal performance.

If you see this message in the AI chat, please refresh the page and try selecting the PDF again from your library.`;

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

    return new Response(
      JSON.stringify({ text: extractedText, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("parse-pdf error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to process document." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
