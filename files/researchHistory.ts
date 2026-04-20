import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateResearchHistorySchema } from "../schemas";

const router = Router();

// GET /api/research
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.researchHistory.findMany({
      where: { user_id: req.user_id },
      orderBy: { created_at: "desc" },
    });
    res.json(history);
  } catch {
    res.status(500).json({ error: "Failed to fetch research history" });
  }
});

// POST /api/research
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateResearchHistorySchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const entry = await prisma.researchHistory.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ error: "Failed to save research history" });
    }
  }
);

// DELETE /api/research/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.researchHistory.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!entry) {
      res.status(404).json({ error: "Research entry not found" });
      return;
    }
    await prisma.researchHistory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete research entry" });
  }
});

export default router;
