import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

interface TimelineItem {
  id: string;
  type: string;
  title: string;
  content: string | null;
  date: Date | string;
  icon: string;
}

interface DBConvo { id: string; role: string; content: string; created_at: Date; }
interface DBGpa { id: string; gpa: { toString: () => string }; total_credits: number; gpa_class: string | null; created_at: Date; }
interface DBResearch { id: string; query: string; ai_summary: string | null; created_at: Date; }
interface DBMaterial { id: string; title: string; description: string | null; created_at: Date; }

const router = Router();

/**
 * GET /api/history
 * Consolidated history of all student activities (AI, GPA, Research, Materials)
 */
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user_id!;

    // Fetch all history types in parallel
    const [aiConversations, gpaRecords, researchHistory, courseMaterials] = await Promise.all([
      prisma.aiConversation.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      prisma.gpaRecord.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
      prisma.researchHistory.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 10,
      }),
      prisma.courseMaterial.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        take: 5,
      }),
    ]);

    // Format into a unified timeline
    const timeline: TimelineItem[] = [
      ...aiConversations.map((c: DBConvo) => ({
        id: c.id,
        type: 'ai_conversation',
        title: c.role === 'user' ? 'User Question' : 'AI Response',
        content: c.content,
        date: c.created_at,
        icon: 'Bot'
      })),
      ...gpaRecords.map((g: DBGpa) => ({
        id: g.id,
        type: 'gpa_calc',
        title: `GPA Calculation: ${g.gpa.toString()}`,
        content: `${g.total_credits} credits total. Class: ${g.gpa_class || 'N/A'}`,
        date: g.created_at,
        icon: 'Calculator'
      })),
      ...researchHistory.map((r: DBResearch) => ({
        id: r.id,
        type: 'research',
        title: `Research: ${r.query}`,
        content: r.ai_summary || 'No summary generated.',
        date: r.created_at,
        icon: 'Search'
      })),
      ...courseMaterials.map((m: DBMaterial) => ({
        id: m.id,
        type: 'course_material',
        title: `Material: ${m.title}`,
        content: m.description || 'Processed course material.',
        date: m.created_at,
        icon: 'BookOpen'
      })),
    ].sort((a: TimelineItem, b: TimelineItem) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(timeline);
  } catch (error: unknown) {
    console.error("History Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch consolidated history" });
  }
});

export default router;
