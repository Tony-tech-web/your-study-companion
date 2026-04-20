import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { UpdateUserStatsSchema } from "../schemas";

const router = Router();

// GET /api/stats/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let stats = await prisma.userStats.findUnique({
      where: { user_id: req.user_id },
    });
    // Auto-create stats row if it doesn't exist yet
    if (!stats) {
      stats = await prisma.userStats.create({
        data: { user_id: req.user_id! },
      });
    }
    res.json(stats);
  } catch {
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// PUT /api/stats/me — merge-update (e.g. increment study minutes)
router.put(
  "/me",
  authenticate,
  validateRequestBody(UpdateUserStatsSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const stats = await prisma.userStats.upsert({
        where: { user_id: req.user_id },
        update: req.body,
        create: { user_id: req.user_id!, ...req.body },
      });
      res.json(stats);
    } catch {
      res.status(500).json({ error: "Failed to update user stats" });
    }
  }
);

// GET /api/stats/leaderboard — top 20 by xp_points
router.get("/leaderboard", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const leaderboard = await prisma.userStats.findMany({
      orderBy: { xp_points: "desc" },
      take: 20,
      select: {
        user_id: true,
        xp_points: true,
        level: true,
        current_streak: true,
        total_study_minutes: true,
        total_ai_interactions: true,
      },
    });
    res.json(leaderboard);
  } catch {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
