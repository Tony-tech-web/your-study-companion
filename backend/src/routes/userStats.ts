import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/stats/me
router.get("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    let stats = await prisma.userStats.findUnique({
      where: { user_id: req.user_id },
    });
    // Auto-create stats row if it doesn't exist yet
    if (!stats) {
      // UserStats has a required FK to Profile — guard against missing profile
      const profile = await prisma.profile.findUnique({
        where: { user_id: req.user_id },
      });
      if (!profile) {
        res.status(404).json({ error: "Profile not found. Please complete onboarding before accessing stats." });
        return;
      }
      stats = await prisma.userStats.create({
        data: { user_id: req.user_id! },
      });
    }
    res.json(stats);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch user stats", details });
  }
});

// PUT /api/stats/me — merge-update (e.g. increment study minutes)
router.put("/me", authenticate, async (req: AuthRequest, res) => {
  try {
    const stats = await prisma.userStats.upsert({
      where: { user_id: req.user_id },
      update: req.body,
      create: { user_id: req.user_id!, ...req.body },
    });
    res.json(stats);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to update user stats", details });
  }
});

// POST /api/stats/pulse — Heartbeat to track study time and award XP
router.post("/pulse", authenticate, async (req: AuthRequest, res) => {
  try {
    const { activity_type } = req.body; // e.g. 'ai_chat', 'research', 'pdf_reading'
    const userId = req.user_id!;

    // 1. Check for GPA multiplier (Scholar Bonus)
    const latestGpa = await prisma.gpaRecord.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: "desc" }
    });

    let multiplier = 1.0;
    if (latestGpa) {
      const gpaValue = Number(latestGpa.gpa);
      if (gpaValue >= 4.0) multiplier = 1.5;
      else if (gpaValue >= 3.5) multiplier = 1.2;
    }

    const xpToAdd = Math.round(1 * multiplier);

    // 2. Update stats
    interface StatsUpdate {
      total_study_minutes: { increment: number };
      xp_points: { increment: number };
      last_activity_date: Date;
      last_pulse_at: Date;
      total_ai_interactions?: { increment: number };
      total_research_minutes?: { increment: number };
    }

    const updateData: StatsUpdate = {
      total_study_minutes: { increment: 1 },
      xp_points: { increment: xpToAdd },
      last_activity_date: new Date(),
      last_pulse_at: new Date(),
    };

    // Specific activity tracking
    if (activity_type === 'ai_chat') updateData.total_ai_interactions = { increment: 1 };
    if (activity_type === 'research') updateData.total_research_minutes = { increment: 1 };
    
    const stats = await prisma.userStats.update({
      where: { user_id: userId },
      data: updateData,
      include: { profile: true }
    });

    // 3. Level Up Logic
    const nextLevelXp = stats.level * 100 + 100;
    if (stats.xp_points >= nextLevelXp) {
      await prisma.userStats.update({
        where: { user_id: userId },
        data: { level: { increment: 1 } }
      });
    }

    res.json({ 
      success: true, 
      xp_earned: xpToAdd, 
      multiplier,
      stats 
    });
  } catch (err) {
    console.error("Pulse Error:", err);
    res.status(500).json({ error: "Pulse failed" });
  }
});

// GET /api/stats/leaderboard — top 50 with profiles
router.get("/leaderboard", authenticate, async (_req: AuthRequest, res) => {
  try {
    const leaderboard = await prisma.userStats.findMany({
      orderBy: { xp_points: "desc" },
      take: 50,
      include: {
        profile: {
          select: {
            full_name: true,
            email_username: true,
            avatar_url: true,
            student_id: true
          }
        }
      }
    });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
