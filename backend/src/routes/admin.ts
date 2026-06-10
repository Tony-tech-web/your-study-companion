import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  adminAuthConfigured,
  createAdminToken,
  getConfiguredAdminUsername,
  requireAdmin,
  verifyAdminCredentials,
  AdminRequest,
} from "../middleware/adminAuth";

const router = Router();

router.post("/login", (req, res: Response) => {
  const { username, password } = req.body || {};

  if (!adminAuthConfigured()) {
    res.status(503).json({ error: "Admin auth is not configured." });
    return;
  }

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required." });
    return;
  }

  if (!verifyAdminCredentials(String(username), String(password))) {
    res.status(401).json({ error: "Invalid admin credentials." });
    return;
  }

  const token = createAdminToken(String(username).trim());
  res.json({
    token,
    token_type: "admin",
    expires_in: 8 * 60 * 60,
    admin: {
      username: getConfiguredAdminUsername(),
      role: "admin",
    },
  });
});

router.get("/session", requireAdmin, (req: AdminRequest, res: Response) => {
  res.json({
    authenticated: true,
    admin: req.admin,
  });
});

router.get("/overview", requireAdmin, async (_req: AdminRequest, res: Response) => {
  const [
    users,
    activeSubscriptions,
    payments,
    news,
    messages,
    aiUsage,
    pdfs,
    plans,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.subscription.count({ where: { status: { in: ["trial", "active", "past_due"] } } }),
    prisma.payment.aggregate({ _sum: { amount_kobo: true }, _count: true, where: { status: { in: ["success", "paid"] } } }),
    prisma.schoolNews.count(),
    prisma.chatMessage.count(),
    prisma.aiUsageEvent.aggregate({ _sum: { total_tokens: true }, _count: true }),
    prisma.studentPdf.count(),
    prisma.billingPlan.count({ where: { is_active: true } }),
  ]);

  res.json({
    users,
    active_subscriptions: activeSubscriptions,
    payment_count: payments._count,
    revenue_kobo: payments._sum.amount_kobo || 0,
    news,
    messages,
    ai_usage_events: aiUsage._count,
    ai_tokens: aiUsage._sum.total_tokens || 0,
    pdfs,
    active_plans: plans,
  });
});

router.get("/users", requireAdmin, async (req: AdminRequest, res: Response) => {
  const query = String(req.query.q || "").trim();
  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { full_name: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { matric_number: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { student_id: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { email_username: { contains: query, mode: Prisma.QueryMode.insensitive } },
        ],
      }
    : {};

  const users = await prisma.profile.findMany({
    where,
    include: { user_stats: true },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  res.json({ users });
});

router.get("/billing", requireAdmin, async (_req: AdminRequest, res: Response) => {
  const [plans, subscriptions, payments, invoices] = await Promise.all([
    prisma.billingPlan.findMany({ orderBy: [{ sort_order: "asc" }, { price_kobo: "asc" }] }),
    prisma.subscription.findMany({
      include: { plan: true },
      orderBy: { updated_at: "desc" },
      take: 100,
    }),
    prisma.payment.findMany({
      include: { plan: true },
      orderBy: { created_at: "desc" },
      take: 100,
    }),
    prisma.invoice.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
    }),
  ]);
  res.json({ plans, subscriptions, payments, invoices });
});

router.get("/ai-usage", requireAdmin, async (_req: AdminRequest, res: Response) => {
  const [summary, byProvider, recent] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      _sum: { total_tokens: true, prompt_tokens: true, completion_tokens: true },
      _count: true,
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["provider"],
      _sum: { total_tokens: true, prompt_tokens: true, completion_tokens: true },
      _count: true,
      orderBy: { _sum: { total_tokens: "desc" } },
    }),
    prisma.aiUsageEvent.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
    }),
  ]);
  res.json({ summary, by_provider: byProvider, recent });
});

router.get("/chats", requireAdmin, async (_req: AdminRequest, res: Response) => {
  const messages = await prisma.chatMessage.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
  });
  res.json({ messages });
});

router.get("/news", requireAdmin, async (_req: AdminRequest, res: Response) => {
  const news = await prisma.schoolNews.findMany({
    orderBy: { published_at: "desc" },
    take: 100,
  });
  res.json({ news });
});

router.post("/news", requireAdmin, async (req: AdminRequest, res: Response) => {
  const { title, content, category } = req.body || {};
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required." });
    return;
  }
  const article = await prisma.schoolNews.create({
    data: { title: String(title), content: String(content), category: category ? String(category) : "General" },
  });
  res.status(201).json(article);
});

router.put("/news/:id", requireAdmin, async (req: AdminRequest, res: Response) => {
  const { title, content, category } = req.body || {};
  const article = await prisma.schoolNews.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined ? { title: String(title) } : {}),
      ...(content !== undefined ? { content: String(content) } : {}),
      ...(category !== undefined ? { category: String(category) } : {}),
    },
  });
  res.json(article);
});

router.delete("/news/:id", requireAdmin, async (req: AdminRequest, res: Response) => {
  await prisma.schoolNews.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
