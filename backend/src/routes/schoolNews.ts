import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, AdminRequest } from "../middleware/adminAuth";

const router = Router();
const streamClients = new Set<Response>();

const sendNewsEvent = (event: string, data: unknown) => {
  const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  streamClients.forEach((client) => client.write(frame));
};

// GET /api/news/stream
router.get("/stream", async (_req, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, at: new Date().toISOString() })}\n\n`);
  streamClients.add(res);

  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
  }, 25000);

  res.on("close", () => {
    clearInterval(heartbeat);
    streamClients.delete(res);
    res.end();
  });
});

// GET /api/news
router.get("/", async (_req, res: Response) => {
  try {
    const news = await prisma.schoolNews.findMany({
      orderBy: { published_at: "desc" },
      take: 20,
    });
    res.json(news);
  } catch (err) {
    console.error("[schoolNews]", err);
    res.status(500).json({ error: "Failed to fetch school news" });
  }
});

// POST /api/news (admin only — no user ownership check)
router.post("/", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }
    const article = await prisma.schoolNews.create({
      data: { title, content, category },
    });
    sendNewsEvent("news.created", article);
    res.status(201).json(article);
  } catch (err) {
    console.error("[schoolNews]", err);
    res.status(500).json({ error: "Failed to create news article" });
  }
});

// PUT /api/news/:id (admin only)
router.put("/:id", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const { title, content, category } = req.body;
    const article = await prisma.schoolNews.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(content !== undefined ? { content: String(content) } : {}),
        ...(category !== undefined ? { category: String(category) } : {}),
      },
    });
    sendNewsEvent("news.updated", article);
    res.json(article);
  } catch (err) {
    console.error("[schoolNews]", err);
    res.status(500).json({ error: "Failed to update news article" });
  }
});

// DELETE /api/news/:id (admin only)
router.delete("/:id", requireAdmin, async (req: AdminRequest, res: Response) => {
  try {
    await prisma.schoolNews.delete({ where: { id: req.params.id } });
    sendNewsEvent("news.deleted", { id: req.params.id });
    res.status(204).send();
  } catch (err) {
    console.error("[schoolNews]", err);
    res.status(500).json({ error: "Failed to delete news article" });
  }
});

export default router;
