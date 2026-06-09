import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export const estimateTokens = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.max(1, Math.ceil(text.length / 4));
};

export const recordAiUsage = async ({
  userId,
  provider,
  feature,
  promptTokens = 0,
  completionTokens = 0,
  metadata,
}: {
  userId: string;
  provider: string;
  feature: string;
  promptTokens?: number;
  completionTokens?: number;
  metadata?: Record<string, unknown>;
}) => {
  const totalTokens = Math.max(0, Math.round(promptTokens + completionTokens));
  if (!userId || totalTokens <= 0) return null;

  return prisma.aiUsageEvent.create({
    data: {
      user_id: userId,
      provider,
      feature,
      prompt_tokens: Math.max(0, Math.round(promptTokens)),
      completion_tokens: Math.max(0, Math.round(completionTokens)),
      total_tokens: totalTokens,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
};

export const getAiUsageSummary = async (userId: string, since?: Date | null) => {
  const where = {
    user_id: userId,
    ...(since ? { created_at: { gte: since } } : {}),
  };

  const [total, byProvider, recent] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      where,
      _sum: {
        total_tokens: true,
        prompt_tokens: true,
        completion_tokens: true,
      },
      _count: true,
    }),
    prisma.aiUsageEvent.groupBy({
      by: ["provider"],
      where,
      _sum: { total_tokens: true },
      _count: true,
    }),
    prisma.aiUsageEvent.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 10,
    }),
  ]);

  return {
    total_tokens: total._sum.total_tokens || 0,
    prompt_tokens: total._sum.prompt_tokens || 0,
    completion_tokens: total._sum.completion_tokens || 0,
    event_count: total._count,
    by_provider: byProvider.reduce<Record<string, { tokens: number; events: number }>>((acc, item) => {
      acc[item.provider] = {
        tokens: item._sum.total_tokens || 0,
        events: item._count,
      };
      return acc;
    }, {}),
    recent,
  };
};
