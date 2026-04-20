import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequestBody } from "zod-express-middleware";
import { CreateStudentPdfSchema } from "../schemas";

const router = Router();

// GET /api/pdfs
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pdfs = await prisma.studentPdf.findMany({
      where: { user_id: req.user_id },
      orderBy: { uploaded_at: "desc" },
    });
    res.json(pdfs);
  } catch {
    res.status(500).json({ error: "Failed to fetch PDFs" });
  }
});

// POST /api/pdfs
router.post(
  "/",
  authenticate,
  validateRequestBody(CreateStudentPdfSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const pdf = await prisma.studentPdf.create({
        data: { ...req.body, user_id: req.user_id! },
      });
      res.status(201).json(pdf);
    } catch {
      res.status(500).json({ error: "Failed to create PDF record" });
    }
  }
);

// DELETE /api/pdfs/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
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
  } catch {
    res.status(500).json({ error: "Failed to delete PDF" });
  }
});

export default router;
