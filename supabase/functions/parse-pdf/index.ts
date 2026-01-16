import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to validate JWT and extract user
async function validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, error: "Missing or invalid authorization header" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return { userId: null, error: "Invalid or expired token" };
  }
  
  return { userId: data.user.id, error: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT and get authenticated user
    const { userId, error: authError } = await validateAuth(req);
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const filePath = body.filePath || body.path;

    // Log for audit
    console.log(`PDF parse request from user: ${userId}, path: ${filePath}`);

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "Missing filePath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate file ownership - file path must belong to authenticated user
    // File paths are stored as: userId/filename.pdf
    if (!filePath.startsWith(`${userId}/`)) {
      console.error(`Access denied: User ${userId} attempted to access file ${filePath}`);
      return new Response(
        JSON.stringify({ error: "Access denied - you can only access your own files" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Additionally verify file exists in database and belongs to user
    const { data: fileRecord, error: verifyError } = await supabase
      .from("student_pdfs")
      .select("id, file_path, user_id")
      .eq("file_path", filePath)
      .eq("user_id", userId)
      .single();

    if (verifyError || !fileRecord) {
      console.error(`File verification failed: ${filePath} for user ${userId}`);
      return new Response(
        JSON.stringify({ error: "File not found or access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Log activity using authenticated userId
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
