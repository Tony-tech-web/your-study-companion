import { Prisma } from "@prisma/client";
import { estimateAiCost } from "./aiPricing";
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

  const [total, byProvider, recent, allCostEvents] = await Promise.all([
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
      _sum: { total_tokens: true, prompt_tokens: true, completion_tokens: true },
      _count: true,
    }),
    prisma.aiUsageEvent.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 10,
    }),
    prisma.aiUsageEvent.findMany({
      where,
      select: {
        provider: true,
        prompt_tokens: true,
        completion_tokens: true,
        metadata: true,
      },
    }),
  ]);

  const recentWithCost = recent.map((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
    const cost = estimateAiCost({
      provider: event.provider,
      model: metadata.model,
      promptTokens: event.prompt_tokens,
      completionTokens: event.completion_tokens,
      serperQueries: Number(metadata.serper_queries || 0),
    });
    return { ...event, cost };
  });

  const providerCostEntries = allCostEvents.map((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
    return estimateAiCost({
      provider: event.provider,
      model: metadata.model,
      promptTokens: event.prompt_tokens,
      completionTokens: event.completion_tokens,
      serperQueries: Number(metadata.serper_queries || 0),
    });
  });
  const costSummary = providerCostEntries.reduce(
    (acc, cost) => {
      acc.provider_cost_usd += cost.provider_cost_usd;
      acc.margin_usd += cost.margin_usd;
      acc.billable_cost_usd += cost.billable_cost_usd;
      acc.billable_cost_kobo += cost.billable_cost_kobo;
      return acc;
    },
    { provider_cost_usd: 0, margin_usd: 0, billable_cost_usd: 0, billable_cost_kobo: 0 }
  );

  return {
    total_tokens: total._sum.total_tokens || 0,
    prompt_tokens: total._sum.prompt_tokens || 0,
    completion_tokens: total._sum.completion_tokens || 0,
    event_count: total._count,
    by_provider: byProvider.reduce<Record<string, { tokens: number; events: number; cost: ReturnType<typeof estimateAiCost> }>>((acc, item) => {
      const cost = estimateAiCost({
        provider: item.provider,
        promptTokens: item._sum.prompt_tokens || 0,
        completionTokens: item._sum.completion_tokens || 0,
      });
      acc[item.provider] = {
        tokens: item._sum.total_tokens || 0,
        events: item._count,
        cost,
      };
      return acc;
    }, {}),
    cost: {
      provider_cost_usd: Number(costSummary.provider_cost_usd.toFixed(6)),
      margin_usd: Number(costSummary.margin_usd.toFixed(6)),
      billable_cost_usd: Number(costSummary.billable_cost_usd.toFixed(6)),
      billable_cost_kobo: costSummary.billable_cost_kobo,
    },
    recent: recentWithCost,
  };
};
