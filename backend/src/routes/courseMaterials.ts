import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/course-materials
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const materials = await prisma.courseMaterial.findMany({
      where: { user_id: req.user_id },
      include: { pdf: true },
      orderBy: { created_at: "desc" },
    });
    res.json(materials);
  } catch {
    res.status(500).json({ error: "Failed to fetch course materials" });
  }
});

// GET /api/course-materials/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const material = await prisma.courseMaterial.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
      include: { pdf: true },
    });
    if (!material) {
      res.status(404).json({ error: "Course material not found" });
      return;
    }
    res.json(material);
  } catch {
    res.status(500).json({ error: "Failed to fetch course material" });
  }
});

// POST /api/course-materials
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { pdf_id, title, description, parsed_content, study_tools } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const material = await prisma.courseMaterial.create({
      data: { pdf_id, title, description, parsed_content, study_tools, user_id: req.user_id! },
    });
    res.status(201).json(material);
  } catch {
    res.status(500).json({ error: "Failed to create course material" });
  }
});

// PUT /api/course-materials/:id
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const material = await prisma.courseMaterial.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!material) {
      res.status(404).json({ error: "Course material not found" });
      return;
    }
    const updated = await prisma.courseMaterial.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update course material" });
  }
});

// DELETE /api/course-materials/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const material = await prisma.courseMaterial.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!material) {
      res.status(404).json({ error: "Course material not found" });
      return;
    }
    await prisma.courseMaterial.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete course material" });
  }
});

export default router;
