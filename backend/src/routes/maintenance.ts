import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

const isAuthorizedCron = (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.header("x-cron-secret") === secret || req.query.secret === secret;
};

router.post("/reconcile-subscriptions", async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron secret required" });
    return;
  }

  const now = new Date();
  const expired = await prisma.subscription.updateMany({
    where: {
      status: { in: ["trial", "active", "past_due"] },
      current_period_end: { lt: now },
      cancel_at_period_end: true,
    },
    data: { status: "expired" },
  });

  const pastDue = await prisma.subscription.updateMany({
    where: {
      status: "active",
      current_period_end: { lt: now },
      cancel_at_period_end: false,
    },
    data: { status: "past_due" },
  });

  res.json({
    ok: true,
    reconciled_at: now.toISOString(),
    expired: expired.count,
    marked_past_due: pastDue.count,
  });
});

router.post("/cleanup-disabled-push-tokens", async (req: Request, res: Response) => {
  if (!isAuthorizedCron(req)) {
    res.status(401).json({ error: "Cron secret required" });
    return;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const deleted = await prisma.devicePushToken.deleteMany({
    where: { enabled: false, updated_at: { lt: cutoff } },
  });

  res.json({ ok: true, deleted: deleted.count });
});

export default router;
