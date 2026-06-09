import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

type StudyPlanBlock = {
  day: number;
  hour: number;
  subject: string;
  duration: number;
  color: string;
};

const PLAN_COLORS = ["#6366f1", "#10b981", "#f27d26", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];
const FOCUS_HOURS = [8, 10, 13, 15, 17, 19];

const parsePlanPayload = (raw: unknown) => {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (Array.isArray(raw)) return { subjects: raw, scheduleBlocks: [], completedSessionIds: [] };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsePlanPayload(parsed);
    } catch {
      return { subjects: [], scheduleBlocks: [], completedSessionIds: [] };
    }
  }
  return { subjects: [], scheduleBlocks: [], completedSessionIds: [] };
};

const normalizeSubjects = (raw: unknown): string[] => {
  const payload = parsePlanPayload(raw);
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  return subjects
    .map((subject) => {
      if (typeof subject === "string") return subject.trim();
      if (subject && typeof subject === "object") {
        const item = subject as Record<string, unknown>;
        return String(item.name || item.title || "").trim();
      }
      return "";
    })
    .filter(Boolean);
};

const inferActivityProfile = (value: string) => {
  const text = value.toLowerCase();
  if (/\b(code|program|javascript|python|lab|build|debug|project|implementation)\b/.test(text)) {
    return { mode: "practice", duration: 2 };
  }
  if (/\b(read|essay|chapter|history|law|literature|note|summary)\b/.test(text)) {
    return { mode: "reading", duration: 1 };
  }
  if (/\b(exam|test|quiz|revision|past question|drill)\b/.test(text)) {
    return { mode: "revision", duration: 1 };
  }
  return { mode: "focused-study", duration: 1 };
};

const generateScheduleBlocks = (subjects: string[], totalHours = 0, daysPerWeek = 5): StudyPlanBlock[] => {
  const cleanSubjects = subjects.filter(Boolean);
  if (cleanSubjects.length === 0) return [];

  const usableDays = [1, 2, 3, 4, 5, 6, 0].slice(0, Math.min(Math.max(daysPerWeek, 1), 7));
  const weeklyHours = Math.max(totalHours || cleanSubjects.length, cleanSubjects.length);
  const blocks: StudyPlanBlock[] = [];
  let assignedHours = 0;

  cleanSubjects.forEach((subject, subjectIndex) => {
    const profile = inferActivityProfile(subject);
    const target = Math.max(1, Math.round(weeklyHours / cleanSubjects.length));
    let remaining = target;
    let turn = 0;

    while (remaining > 0 && assignedHours < weeklyHours + cleanSubjects.length) {
      const duration = Math.min(profile.duration, remaining);
      const day = usableDays[(subjectIndex + turn * 2) % usableDays.length];
      const hour = FOCUS_HOURS[(subjectIndex * 2 + turn) % FOCUS_HOURS.length];
      blocks.push({
        day,
        hour,
        subject,
        duration,
        color: PLAN_COLORS[subjectIndex % PLAN_COLORS.length],
      });
      remaining -= duration;
      assignedHours += duration;
      turn += 1;
    }
  });

  return blocks.sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7) || a.hour - b.hour);
};

const ensureSchedulePayload = (subjectsRaw: unknown, totalHours = 0, daysPerWeek = 5) => {
  const payload = parsePlanPayload(subjectsRaw);
  const subjects = normalizeSubjects(payload);
  const scheduleBlocks = Array.isArray(payload.scheduleBlocks) && payload.scheduleBlocks.length > 0
    ? payload.scheduleBlocks
    : generateScheduleBlocks(subjects, totalHours, daysPerWeek);

  return {
    subjects,
    scheduleBlocks,
    completedSessionIds: Array.isArray(payload.completedSessionIds) ? payload.completedSessionIds : [],
  };
};

// POST /api/study-plans/randomize
router.post("/randomize", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { subjects, total_hours, days_per_week } = req.body;
    const cleanSubjects = normalizeSubjects(Array.isArray(subjects) ? subjects : { subjects });
    if (cleanSubjects.length === 0) {
      res.status(400).json({ error: "subjects are required" });
      return;
    }

    const blocks = generateScheduleBlocks(cleanSubjects, Number(total_hours) || 0, Number(days_per_week) || 5);
    res.json({
      blocks,
      summary: `Created ${blocks.length} study sessions from ${cleanSubjects.length} detected activity area${cleanSubjects.length === 1 ? "" : "s"}.`,
      detectedItems: cleanSubjects.map((subject) => ({ subject, ...inferActivityProfile(subject) })),
    });
  } catch (err) {
    console.error("[studyPlans] randomize", err);
    res.status(500).json({ error: "Failed to randomize study plan" });
  }
});

// GET /api/study-plans
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.studyPlan.findMany({
      where: { user_id: req.user_id },
      orderBy: { created_at: "desc" },
    });
    res.json(plans);
  } catch (err) {
    console.error("[studyPlans]", err);
    res.status(500).json({ error: "Failed to fetch study plans" });
  }
});

// POST /api/study-plans
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, subjects, total_hours, days_per_week } = req.body;
    if (!name || !subjects) {
      res.status(400).json({ error: "name and subjects are required" });
      return;
    }
    const payload = ensureSchedulePayload(subjects, Number(total_hours) || 0, Number(days_per_week) || 5);
    const plan = await prisma.studyPlan.create({
      data: { name, subjects: payload, total_hours: total_hours ?? 0, user_id: req.user_id! },
    });
    res.status(201).json(plan);
  } catch (err) {
    console.error("[studyPlans]", err);
    res.status(500).json({ error: "Failed to create study plan" });
  }
});

// PUT /api/study-plans/:id
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!plan) {
      res.status(404).json({ error: "Study plan not found" });
      return;
    }
    const nextBody = { ...req.body };
    if (nextBody.subjects) {
      nextBody.subjects = ensureSchedulePayload(nextBody.subjects, Number(nextBody.total_hours ?? plan.total_hours) || 0);
    }
    const updated = await prisma.studyPlan.update({
      where: { id: req.params.id },
      data: nextBody,
    });
    res.json(updated);
  } catch (err) {
    console.error("[studyPlans]", err);
    res.status(500).json({ error: "Failed to update study plan" });
  }
});

// DELETE /api/study-plans/:id
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: req.params.id, user_id: req.user_id },
    });
    if (!plan) {
      res.status(404).json({ error: "Study plan not found" });
      return;
    }
    await prisma.studyPlan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error("[studyPlans]", err);
    res.status(500).json({ error: "Failed to delete study plan" });
  }
});

export default router;
