import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateStudyPlanSchema, UpdateStudyPlanSchema } from "../schemas";

const router = Router();

// GET /api/study-plans
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.studyPlan.findMany({
      where: { user_id: req.user_id },
      orderBy: { created_at: "desc" },
    });
    res.json(plans);
  } catch {
    res.status(500).json({ error: "Failed to fetch study plans" });
  }
});

// POST /api/study-plans
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateStudyPlanSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const plan = await prisma.studyPlan.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(plan);
    } catch {
      res.status(500).json({ error: "Failed to create study plan" });
    }
  }
);

// PUT /api/study-plans/:id
router.put(
  "/:id",
  authenticate,
  validateRequestBody(UpdateStudyPlanSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const plan = await prisma.studyPlan.findFirst({
        where: { id: req.params.id, user_id: req.user_id },
      });
      if (!plan) {
        res.status(404).json({ error: "Study plan not found" });
        return;
      }
      const updated = await prisma.studyPlan.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update study plan" });
    }
  }
);

// DELETE /api/study-plans/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!plan) {
      res.status(404).json({ error: "Study plan not found" });
      return;
    }
    await prisma.studyPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete study plan" });
  }
});

export default router;
