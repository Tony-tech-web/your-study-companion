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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
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

    // 33. Download file from storage
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

    // Use a lightweight PDF parsing strategy
    let extractedText = "";
    try {
      // Import pdfjs-dist dynamically to avoid issues with basic Deno deployments
      // We use a specific version that's known to be stable with ESM
      const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/+esm");
      
      const arrayBuffer = await fileData.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true,
      });
      
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      console.info(`Extracting text from ${numPages} pages...`);
      
      let fullText = "";
      // Limit to first 50 pages to stay within memory/time limits
      const pagesToProcess = Math.min(numPages, 50);
      
      for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += `[Page ${i}]\n${pageText}\n\n`;
      }
      
      extractedText = fullText.trim();
      
      if (!extractedText) {
        throw new Error("No text content found in PDF (might be image-based)");
      }
      
      console.info(`Successfully extracted ${extractedText.length} characters`);
    } catch (parseError) {
      console.error("PDF Parse error:", parseError);
      // Fallback message if extraction fails (e.g. scanned PDF)
      extractedText = `[STUDY DOCUMENT: ${filePath.split('/').pop()}]
      
NOTE: This document appears to be image-based or protected. I can see that it's present, but I couldn't extract the text directly. 

As a study assistant, I suggest:
1. Try uploading a text-based version of this PDF.
2. Paste specific important sections from the document here for analysis.
3. If this is a scanned textbook, try using an OCR tool first.`;
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

    return new Response(
      JSON.stringify({ text: extractedText }),
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
