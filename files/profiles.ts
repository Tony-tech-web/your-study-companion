import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { UpdateProfileSchema } from "../schemas";

const router = Router();

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
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/profiles/me
router.put(
  "/me",
  authenticate,
  validateRequestBody(UpdateProfileSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const updated = await prisma.profile.update({
        where: { user_id: req.user_id },
        data: req.body,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

export default router;
