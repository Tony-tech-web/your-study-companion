import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/preferences", authenticate, async (req: AuthRequest, res: Response) => {
  const prefs = await prisma.notificationPreference.upsert({
    where: { user_id: req.user_id! },
    update: {},
    create: { user_id: req.user_id! },
  });
  res.json(prefs);
});

router.put("/preferences", authenticate, async (req: AuthRequest, res: Response) => {
  const allowed = ["planner_reminders", "chat_messages", "news_updates", "billing_alerts"] as const;
  const data = Object.fromEntries(
    allowed
      .filter((key) => typeof req.body?.[key] === "boolean")
      .map((key) => [key, req.body[key]])
  );

  const prefs = await prisma.notificationPreference.upsert({
    where: { user_id: req.user_id! },
    update: data,
    create: { user_id: req.user_id!, ...data },
  });
  res.json(prefs);
});

router.post("/device-tokens", authenticate, async (req: AuthRequest, res: Response) => {
  const { token, platform, device_id } = req.body || {};
  if (!token || !platform) {
    res.status(400).json({ error: "token and platform are required" });
    return;
  }

  const record = await prisma.devicePushToken.upsert({
    where: { token: String(token) },
    update: {
      user_id: req.user_id!,
      platform: String(platform),
      device_id: device_id ? String(device_id) : null,
      enabled: true,
    },
    create: {
      user_id: req.user_id!,
      token: String(token),
      platform: String(platform),
      device_id: device_id ? String(device_id) : null,
    },
  });
  res.status(201).json(record);
});

router.delete("/device-tokens/:token", authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.devicePushToken.updateMany({
    where: { token: req.params.token, user_id: req.user_id! },
    data: { enabled: false },
  });
  res.status(204).send();
});

export default router;
