import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateChatMessageSchema } from "../schemas";

const router = Router();

// GET /api/chat — get messages for current user (sent + received + public)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { sender_id: req.user_id },
          { receiver_id: req.user_id },
          { receiver_id: null },
        ],
      },
      orderBy: { created_at: "asc" },
      take: 100,
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /api/chat
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateChatMessageSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const message = await prisma.chatMessage.create({
        data: { ...req.body, sender_id: req.user_id! },
      });
      res.status(201).json(message);
    } catch {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

// DELETE /api/chat/:id — only sender can delete
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const msg = await prisma.chatMessage.findFirst({
      where: { id: req.params.id, sender_id: req.user_id },
    });
    if (!msg) {
      res.status(404).json({ error: "Message not found" });
      return;
    }
    await prisma.chatMessage.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

export default router;
