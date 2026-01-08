import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type = "xp", limit = 20, userId } = await req.json();

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
      .limit(limit);

    if (error) throw error;

    // Get profile information for each user
    const userIds = leaderboard?.map(l => l.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email_username, avatar_url, student_id")
      .in("user_id", userIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = p;
    });

    // Combine data
    const rankedLeaderboard = leaderboard?.map((entry, index) => {
      const profile = profileMap[entry.user_id] || {};
      return {
        rank: index + 1,
        userId: entry.user_id,
        name: profile.full_name || profile.email_username || "Anonymous",
        studentId: profile.student_id || "",
        avatarUrl: profile.avatar_url,
        xpPoints: entry.xp_points || 0,
        level: entry.level || 1,
        title: LEVEL_TITLES[Math.min((entry.level || 1) - 1, LEVEL_TITLES.length - 1)],
        currentStreak: entry.current_streak || 0,
        longestStreak: entry.longest_streak || 0,
        totalInteractions: (entry.total_ai_interactions || 0) + (entry.total_pdfs_processed || 0),
      };
    }) || [];

    // Get current user's rank if userId provided
    let userRank = null;
    if (userId) {
      const userIndex = rankedLeaderboard.findIndex(l => l.userId === userId);
      if (userIndex >= 0) {
        userRank = rankedLeaderboard[userIndex];
      } else {
        // User not in top, get their stats
        const { data: userStats } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (userStats) {
          const { count } = await supabase
            .from("user_stats")
            .select("*", { count: "exact", head: true })
            .gt(orderBy, userStats[orderBy as keyof typeof userStats] || 0);

          const { data: userProfile } = await supabase
            .from("profiles")
            .select("full_name, email_username, avatar_url, student_id")
            .eq("user_id", userId)
            .single();

          userRank = {
            rank: (count || 0) + 1,
            userId,
            name: userProfile?.full_name || userProfile?.email_username || "You",
            studentId: userProfile?.student_id || "",
            avatarUrl: userProfile?.avatar_url,
            xpPoints: userStats.xp_points || 0,
            level: userStats.level || 1,
            title: LEVEL_TITLES[Math.min((userStats.level || 1) - 1, LEVEL_TITLES.length - 1)],
            currentStreak: userStats.current_streak || 0,
            longestStreak: userStats.longest_streak || 0,
            totalInteractions: (userStats.total_ai_interactions || 0) + (userStats.total_pdfs_processed || 0),
          };
        }
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
