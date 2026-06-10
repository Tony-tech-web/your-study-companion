import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/users", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const query = String(req.query.q || "").trim();
    const where = query
      ? {
          OR: [
            { full_name: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { email_username: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { matric_number: { contains: query, mode: Prisma.QueryMode.insensitive } },
            { student_id: { contains: query, mode: Prisma.QueryMode.insensitive } },
          ],
          NOT: { user_id: req.user_id },
        }
      : { NOT: { user_id: req.user_id } };

    const users = await prisma.profile.findMany({
      where,
      orderBy: { full_name: "asc" },
      take: 25,
      select: {
        user_id: true,
        full_name: true,
        email_username: true,
        matric_number: true,
        student_id: true,
        avatar_url: true,
        field_of_study: true,
      },
    });
    res.json({ users });
  } catch (err) {
    console.error("[chatMessages] GET /users", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { receiver_id: null },
          { sender_id: req.user_id },
          { receiver_id: req.user_id },
        ],
      },
      orderBy: { created_at: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("[chatMessages] GET /", err);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

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
