import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { supabase } from "../lib/supabase";

const router = Router();

router.post("/deactivate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.update({
      where: { user_id: req.user_id! },
      data: {
        account_status: "deactivated",
        deactivated_at: new Date(),
      },
    });
    res.json({ status: profile.account_status, deactivated_at: profile.deactivated_at });
  } catch (err) {
    console.error("[account] deactivate", err);
    res.status(500).json({ error: "Failed to deactivate account" });
  }
});

router.post("/reactivate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.profile.update({
      where: { user_id: req.user_id! },
      data: {
        account_status: "active",
        deactivated_at: null,
      },
    });
    res.json({ status: profile.account_status });
  } catch (err) {
    console.error("[account] reactivate", err);
    res.status(500).json({ error: "Failed to reactivate account" });
  }
});

router.delete("/", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user_id!;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.aiUsageEvent.deleteMany({ where: { user_id: userId } });
      await tx.invoice.deleteMany({ where: { user_id: userId } });
      await tx.payment.deleteMany({ where: { user_id: userId } });
      await tx.subscription.deleteMany({ where: { user_id: userId } });
      await tx.courseMaterial.deleteMany({ where: { user_id: userId } });
      await tx.studentPdf.deleteMany({ where: { user_id: userId } });
      await tx.studyPlan.deleteMany({ where: { user_id: userId } });
      await tx.researchHistory.deleteMany({ where: { user_id: userId } });
      await tx.gpaRecord.deleteMany({ where: { user_id: userId } });
      await tx.learningActivity.deleteMany({ where: { user_id: userId } });
      await tx.aiConversation.deleteMany({ where: { user_id: userId } });
      await tx.chatMessage.deleteMany({
        where: { OR: [{ sender_id: userId }, { receiver_id: userId }] },
      });
      await tx.userStats.deleteMany({ where: { user_id: userId } });
      await tx.profile.deleteMany({ where: { user_id: userId } });
    });

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[account] supabase delete", error.message);
      res.status(202).json({
        deleted_app_data: true,
        auth_deleted: false,
        warning: "Application data was deleted, but Supabase auth deletion needs service-role configuration.",
      });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error("[account] delete", err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
