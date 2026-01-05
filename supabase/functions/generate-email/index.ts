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
    const body = await req.json();
    const { first_name, last_name, preferred_email, insert_profile, user_id } = body;
    
    if (!first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "first_name and last_name required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalize = (s: string) => {
      let out = s.toLowerCase();
      out = out.normalize("NFD").replace(/\p{Diacritic}/gu, "");
      out = out.replace(/\s+/g, "");
      out = out.replace(/[^a-z0-9-]/g, "");
      return out;
    };

    const localBase = `${normalize(first_name)}.${normalize(last_name)}`;
    const domain = "elizadeuniversity.edu.ng";

    if (preferred_email) {
      const parts = preferred_email.split("@");
      if (parts.length !== 2 || parts[1].toLowerCase() !== domain) {
        return new Response(
          JSON.stringify({ error: `preferred_email must be @${domain}` }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ email: preferred_email.toLowerCase() }), 
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for collisions in profiles table
    const { data: existing, error: queryError } = await supabase
      .from("profiles")
      .select("email_username")
      .ilike("email_username", `${localBase}%`);

    if (queryError) throw queryError;

    const taken = new Set(existing.map((p) => p.email_username));
    let candidate = localBase;
    let counter = 0;
    
    while (taken.has(candidate)) {
      counter++;
      candidate = `${localBase}${counter}`;
      if (counter > 1000) break;
    }

    const email = `${candidate}@${domain}`;

    if (insert_profile) {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id required to insert profile" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({ user_id, email, email_username: candidate })
        .select()
        .single();

      if (insertError) throw insertError;
      
      return new Response(
        JSON.stringify({ email, inserted }), 
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ email }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("generate-email error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", detail: String(err) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
