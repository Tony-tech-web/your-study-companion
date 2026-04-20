import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateGpaRecordSchema, UpdateGpaRecordSchema } from "../schemas";

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
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateGpaRecordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const record = await prisma.gpaRecord.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(record);
    } catch {
      res.status(500).json({ error: "Failed to create GPA record" });
    }
  }
);

// PUT /api/gpa/:id
router.put(
  "/:id",
  authenticate,
  validateRequestBody(UpdateGpaRecordSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const record = await prisma.gpaRecord.findFirst({
        where: { id: req.params.id, user_id: req.user_id },
      });
      if (!record) {
        res.status(404).json({ error: "GPA record not found" });
        return;
      }
      const updated = await prisma.gpaRecord.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update GPA record" });
    }
  }
);

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
