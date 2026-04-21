import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/profiles - List all student profiles (for directory/leaderboard)
router.get("/", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { full_name: 'asc' },
      select: {
        id: true,
        user_id: true,
        full_name: true,
        email_username: true,
        avatar_url: true,
        field_of_study: true,
        student_id: true,
      }
    });
    res.json(profiles);
  } catch (err) {
    console.error("[profiles]", err);
    res.status(500).json({ error: "Failed to fetch student directory" });
  }
});

// GET /api/profiles/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { user_id: req.user_id },
    });
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(profile);
  } catch (err) {
    console.error("[profiles]", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profiles/me
router.put("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, phone_number, avatar_url, matric_number, field_of_study } = req.body;
    const profile = await prisma.profile.update({
      where: { user_id: req.user_id },
      data: { 
        full_name, 
        phone_number, 
        avatar_url, 
        matric_number, 
        field_of_study
      },
    });
    res.json(profile);
  } catch (err) {
    console.error("[profiles]", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
