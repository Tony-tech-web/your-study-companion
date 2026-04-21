import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/chat — get chat messages for user
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sender_id: req.user_id },
      orderBy: { created_at: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("[chatMessages] GET /", err);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// POST /api/chat
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, receiver_id } = req.body;
    if (!content) {
      res.status(400).json({ error: "content is required" });
      return;
    }
    const message = await prisma.chatMessage.create({
      data: { content, receiver_id, sender_id: req.user_id! },
    });
    res.status(201).json(message);
  } catch (err) {
    console.error("[chatMessages] POST /", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
