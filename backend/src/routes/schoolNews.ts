import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/news
router.get("/", async (_req, res: Response) => {
  try {
    const news = await prisma.schoolNews.findMany({
      orderBy: { published_at: "desc" },
      take: 20,
    });
    res.json(news);
  } catch {
    res.status(500).json({ error: "Failed to fetch school news" });
  }
});

// POST /api/news (admin only — no user ownership check)
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }
    const article = await prisma.schoolNews.create({
      data: { title, content, category },
    });
    res.status(201).json(article);
  } catch {
    res.status(500).json({ error: "Failed to create news article" });
  }
});

export default router;
