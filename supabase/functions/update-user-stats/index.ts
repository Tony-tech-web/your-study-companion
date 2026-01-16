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

const XP_VALUES: Record<string, number> = {
  ai_chat: 5,
  pdf_upload: 15,
  quiz: 25,
  flashcard: 10,
  research: 20,
  gpa_record: 30,
  study_plan: 20,
};

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

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

function calculateLevel(xp: number): { level: number; title: string; nextLevelXp: number; progress: number } {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] + 1000;
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = Math.min(100, (xpInLevel / xpNeeded) * 100);
  
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    nextLevelXp: nextThreshold,
    progress
  };
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

    const { activityType, incrementValue = 1 } = await req.json();

    // Log for audit - using authenticated userId, not from request body
    console.log(`Stats update for user: ${userId}, activity: ${activityType}`);

    // Get or create user stats
    let { data: stats, error: statsError } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (statsError && statsError.code === "PGRST116") {
      // Create new stats
      const { data: newStats, error: createError } = await supabase
        .from("user_stats")
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (createError) throw createError;
      stats = newStats;
    }

    if (!stats) {
      throw new Error("Failed to get user stats");
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = stats.last_activity_date;
    
    // Calculate streak
    let newStreak = stats.current_streak || 0;
    let longestStreak = stats.longest_streak || 0;
    
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivity === yesterdayStr) {
        newStreak += 1;
      } else if (lastActivity !== today) {
        newStreak = 1;
      }
      
      if (newStreak > longestStreak) {
        longestStreak = newStreak;
      }
    }

    // Calculate XP
    const xpGained = XP_VALUES[activityType] || 5;
    const newXp = (stats.xp_points || 0) + (xpGained * incrementValue);
    const levelInfo = calculateLevel(newXp);

    // Prepare update
    const updates: Record<string, any> = {
      last_activity_date: today,
      current_streak: newStreak,
      longest_streak: longestStreak,
      xp_points: newXp,
      level: levelInfo.level,
      updated_at: new Date().toISOString(),
    };

    // Increment specific counters
    if (activityType === "ai_chat") {
      updates.total_ai_interactions = (stats.total_ai_interactions || 0) + incrementValue;
    } else if (activityType === "pdf_upload") {
      updates.total_pdfs_processed = (stats.total_pdfs_processed || 0) + incrementValue;
    } else if (activityType === "quiz") {
      updates.total_quizzes_completed = (stats.total_quizzes_completed || 0) + incrementValue;
    } else if (activityType === "flashcard") {
      updates.total_flashcards_reviewed = (stats.total_flashcards_reviewed || 0) + incrementValue;
    }

    // Update stats
    const { data: updatedStats, error: updateError } = await supabase
      .from("user_stats")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check for level up
    const previousLevel = stats.level || 1;
    const leveledUp = levelInfo.level > previousLevel;

    return new Response(
      JSON.stringify({
        success: true,
        stats: updatedStats,
        xpGained,
        levelInfo,
        leveledUp,
        newTitle: leveledUp ? levelInfo.title : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("update-user-stats error:", e);
    return new Response(
      JSON.stringify({ error: "Failed to update stats" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
