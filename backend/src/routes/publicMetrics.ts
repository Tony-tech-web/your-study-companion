import { Router, Response, Request } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

type LandingMetricValue = number | null;

interface LandingMetric {
  key: "active_students" | "ai_interactions" | "study_hours" | "processed_materials";
  label: string;
  value: LandingMetricValue;
  unit: "count" | "hours";
  source: string;
}

const toNumber = (value: unknown): LandingMetricValue => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  return null;
};

/**
 * GET /api/public/landing-metrics
 * Public, read-only aggregate metrics for unauthenticated landing pages.
 * Every value is computed from persisted production tables; unavailable values
 * are returned as null instead of being replaced with placeholders.
 */
router.get("/landing-metrics", async (_req: Request, res: Response) => {
  const [
    activeStudentsResult,
    statsAggregateResult,
    processedMaterialsResult,
  ] = await Promise.allSettled([
    prisma.profile.count(),
    prisma.userStats.aggregate({
      _sum: {
        total_ai_interactions: true,
        total_study_minutes: true,
      },
    }),
    prisma.courseMaterial.count({ where: { is_processed: true } }),
  ]);

  const activeStudents = activeStudentsResult.status === "fulfilled"
    ? activeStudentsResult.value
    : null;

  const aiInteractions = statsAggregateResult.status === "fulfilled"
    ? toNumber(statsAggregateResult.value._sum.total_ai_interactions)
    : null;

  const studyMinutes = statsAggregateResult.status === "fulfilled"
    ? toNumber(statsAggregateResult.value._sum.total_study_minutes)
    : null;

  const processedMaterials = processedMaterialsResult.status === "fulfilled"
    ? processedMaterialsResult.value
    : null;

  const metrics: LandingMetric[] = [
    {
      key: "active_students",
      label: "Active Students",
      value: activeStudents,
      unit: "count",
      source: "profiles.count",
    },
    {
      key: "ai_interactions",
      label: "AI Interactions",
      value: aiInteractions,
      unit: "count",
      source: "user_stats.total_ai_interactions.sum",
    },
    {
      key: "study_hours",
      label: "Study Hours",
      value: studyMinutes === null ? null : Math.round((studyMinutes / 60) * 10) / 10,
      unit: "hours",
      source: "user_stats.total_study_minutes.sum",
    },
    {
      key: "processed_materials",
      label: "Processed Materials",
      value: processedMaterials,
      unit: "count",
      source: "course_materials.processed.count",
    },
  ];

  const unavailable = metrics
    .filter((metric) => metric.value === null)
    .map((metric) => metric.key);

  res.json({
    generated_at: new Date().toISOString(),
    metrics,
    unavailable,
  });
});

export default router;
