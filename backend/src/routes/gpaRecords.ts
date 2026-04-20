import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/gpa
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const records = await prisma.gpaRecord.findMany({
      where: { user_id: req.user_id },
      orderBy: { created_at: "desc" },
    });
    res.json(records);
  } catch {
    res.status(500).json({ error: "Failed to fetch GPA records" });
  }
});

// POST /api/gpa
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { semester, courses, gpa, total_credits, gpa_class } = req.body;
    if (gpa === undefined || !courses || total_credits === undefined) {
      res.status(400).json({ error: "courses, gpa, and total_credits are required" });
      return;
    }
    const record = await prisma.gpaRecord.create({
      data: { semester, courses, gpa, total_credits, gpa_class, user_id: req.user_id! },
    });
    res.status(201).json(record);
  } catch {
    res.status(500).json({ error: "Failed to create GPA record" });
  }
});

// DELETE /api/gpa/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const record = await prisma.gpaRecord.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!record) {
      res.status(404).json({ error: "GPA record not found" });
      return;
    }
    await prisma.gpaRecord.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete GPA record" });
  }
});

export default router;
