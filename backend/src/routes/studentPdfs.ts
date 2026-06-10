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

// POST /api/pdfs/:id/scan
router.post("/:id/scan", authenticate, async (req: AuthRequest, res) => {
  try {
    const pdf = await prisma.studentPdf.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!pdf) {
      res.status(404).json({ error: "PDF not found" });
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.authorization;
    if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
      res.status(503).json({ error: "PDF parsing is not configured on the server." });
      return;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/parse-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ filePath: pdf.file_path, pages: req.body?.pages }),
    });
    const parsed: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({ error: parsed.error || "Failed to parse PDF" });
      return;
    }

    const existingMaterial = await prisma.courseMaterial.findFirst({
      where: { pdf_id: pdf.id, user_id: req.user_id },
    });
    const materialData = {
      title: pdf.file_name.replace(/\.pdf$/i, ""),
      description: `${parsed.pageCount || 0} pages extracted from ${pdf.file_name}`,
      parsed_content: parsed.text || "",
      is_processed: true,
    };
    const material = existingMaterial
      ? await prisma.courseMaterial.update({
          where: { id: existingMaterial.id },
          data: materialData,
        })
      : await prisma.courseMaterial.create({
          data: {
            ...materialData,
            user_id: req.user_id!,
            pdf_id: pdf.id,
          },
        });

    res.json({
      ...pdf,
      total_pages: parsed.pageCount || 0,
      scanned_pages: parsed.pageCount || 0,
      parsed_text_length: String(parsed.text || "").length,
      material,
    });
  } catch (err) {
    console.error("[studentPdfs] scan", err);
    const details = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Failed to scan PDF", details });
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
