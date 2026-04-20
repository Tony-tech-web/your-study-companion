import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/pdfs
router.get("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const pdfs = await prisma.studentPdf.findMany({
      where: { user_id: req.user_id },
      orderBy: { uploaded_at: "desc" },
    });
    res.json(pdfs);
  } catch (err) {
    console.error("Prisma Error:", err);
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to fetch PDFs", details });
  }
});

// POST /api/pdfs
router.post("/", authenticate, async (req: AuthRequest, res) => {
  try {
    const { file_name, file_path, file_size } = req.body;
    if (!file_name || !file_path) {
      res.status(400).json({ error: "file_name and file_path are required" });
      return;
    }
    const pdf = await prisma.studentPdf.create({
      data: { file_name, file_path, file_size, user_id: req.user_id! },
    });
    res.status(201).json(pdf);
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to create PDF record", details });
  }
});

// DELETE /api/pdfs/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res) => {
  try {
    const pdf = await prisma.studentPdf.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }
    await prisma.studentPdf.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to delete PDF", details });
  }
});

export default router;
