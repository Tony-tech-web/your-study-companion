import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateAiConversationSchema } from "../schemas";

const router = Router();

// GET /api/ai-conversations
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.aiConversation.findMany({
      where: { user_id: req.user_id },
      orderBy: { created_at: "asc" },
    });
    res.json(conversations);
  } catch {
    res.status(500).json({ error: "Failed to fetch AI conversations" });
  }
});

// POST /api/ai-conversations
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateAiConversationSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const entry = await prisma.aiConversation.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ error: "Failed to save AI conversation" });
    }
  }
);

// DELETE /api/ai-conversations — clears all for the user
router.delete("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.aiConversation.deleteMany({ where: { user_id: req.user_id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to clear AI conversations" });
  }
});

// DELETE /api/ai-conversations/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.aiConversation.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!entry) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    await prisma.aiConversation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete AI conversation" });
  }
});

export default router;
