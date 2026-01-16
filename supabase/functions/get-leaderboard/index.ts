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

const LEVEL_TITLES = [
  "Freshman Scholar",
  "Active Learner", 
  "Knowledge Seeker",
  "Study Warrior",
  "Academic Pro",
  "Research Master",
  "Scholarly Elite",
  "Academic Champion",
  "Learning Legend",
  "Knowledge Sage",
  "Grand Scholar",
  "Academic Grandmaster"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT and get authenticated user
    const { userId: authenticatedUserId, error: authError } = await validateAuth(req);
    if (authError || !authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log for audit
    console.log(`Leaderboard request from user: ${authenticatedUserId}`);

    const { type = "xp", limit = 20 } = await req.json();

    // Cap limit to prevent abuse
    const safeLimit = Math.min(Math.max(1, limit), 50);

    let orderBy = "xp_points";
    if (type === "streak") orderBy = "current_streak";
    else if (type === "level") orderBy = "level";

    // Get leaderboard
    const { data: leaderboard, error } = await supabase
      .from("user_stats")
      .select(`
        user_id,
        xp_points,
        level,
        current_streak,
        longest_streak,
        total_ai_interactions,
        total_pdfs_processed
      `)
      .order(orderBy, { ascending: false })
      .limit(safeLimit);

    if (error) throw error;

    // Get profile information - but only expose minimal data for privacy
    const userIds = leaderboard?.map(l => l.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = p;
    });

    // Combine data - SECURITY: Only expose first name and avatar, no email or student ID
    const rankedLeaderboard = leaderboard?.map((entry, index) => {
      const profile = profileMap[entry.user_id] || {};
      // Only show first name for privacy
      const firstName = profile.full_name?.split(' ')[0] || "Student";
      return {
        rank: index + 1,
        // Don't expose userId to other users - only for the authenticated user's own entry
        userId: entry.user_id === authenticatedUserId ? entry.user_id : undefined,
        displayName: firstName,
        avatarUrl: profile.avatar_url,
        // Removed: email_username, student_id - privacy sensitive
        xpPoints: entry.xp_points || 0,
        level: entry.level || 1,
        title: LEVEL_TITLES[Math.min((entry.level || 1) - 1, LEVEL_TITLES.length - 1)],
        currentStreak: entry.current_streak || 0,
        longestStreak: entry.longest_streak || 0,
        totalInteractions: (entry.total_ai_interactions || 0) + (entry.total_pdfs_processed || 0),
      };
    }) || [];

    // Get authenticated user's rank using JWT userId (not from request body)
    let userRank = null;
    const userIndex = rankedLeaderboard.findIndex(l => l.userId === authenticatedUserId);
    if (userIndex >= 0) {
      userRank = rankedLeaderboard[userIndex];
    } else {
      // User not in top, get their stats
      const { data: userStats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", authenticatedUserId)
        .single();

      if (userStats) {
        const { count } = await supabase
          .from("user_stats")
          .select("*", { count: "exact", head: true })
          .gt(orderBy, userStats[orderBy as keyof typeof userStats] || 0);

        const { data: userProfile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("user_id", authenticatedUserId)
          .single();

        userRank = {
          rank: (count || 0) + 1,
          userId: authenticatedUserId,
          displayName: userProfile?.full_name?.split(' ')[0] || "You",
          avatarUrl: userProfile?.avatar_url,
          // Removed: email_username, student_id - privacy sensitive
          xpPoints: userStats.xp_points || 0,
          level: userStats.level || 1,
          title: LEVEL_TITLES[Math.min((userStats.level || 1) - 1, LEVEL_TITLES.length - 1)],
          currentStreak: userStats.current_streak || 0,
          longestStreak: userStats.longest_streak || 0,
          totalInteractions: (userStats.total_ai_interactions || 0) + (userStats.total_pdfs_processed || 0),
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        leaderboard: rankedLeaderboard,
        userRank,
        type,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("get-leaderboard error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to get leaderboard" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
