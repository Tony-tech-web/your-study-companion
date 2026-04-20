import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateLearningActivitySchema } from "../schemas";

const router = Router();

// GET /api/activity
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await prisma.learningActivity.findMany({
      where: { user_id: req.user_id },
      orderBy: { activity_date: "desc" },
    });
    res.json(activity);
  } catch {
    res.status(500).json({ error: "Failed to fetch learning activity" });
  }
});

// POST /api/activity
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateLearningActivitySchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const entry = await prisma.learningActivity.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ error: "Failed to log learning activity" });
    }
  }
);

export default router;
