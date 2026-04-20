import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();

// GET /api/news — public to all authenticated users
router.get("/", authenticate, async (_req: Request, res: Response) => {
  try {
    const news = await prisma.schoolNews.findMany({
      orderBy: { published_at: "desc" },
    });
    res.json(news);
  } catch {
    res.status(500).json({ error: "Failed to fetch school news" });
  }
});

// GET /api/news/:id
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const item = await prisma.schoolNews.findUnique({
      where: { id: req.params.id },
    });
    if (!item) {
      res.status(404).json({ error: "News item not found" });
      return;
    }
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to fetch news item" });
  }
});

export default router;
