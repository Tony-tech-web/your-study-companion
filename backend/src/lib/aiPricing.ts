export const AI_MARGIN_RATE = 0.15;

export type AiRateKey =
  | "openai:gpt-4o-mini"
  | "gemini:gemini-2.5-flash-lite"
  | "gemini:gemini-2.5-flash"
  | "openrouter:openai/gpt-4o-mini"
  | "openrouter:google/gemini-2.5-flash-lite"
  | "openrouter:google/gemini-2.5-flash";

export type AiRate = {
  provider: string;
  model: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  className: "economy" | "balanced" | "premium" | "fallback";
};

export const AI_RATES: Record<AiRateKey, AiRate> = {
  "openai:gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.6,
    className: "balanced",
  },
  "gemini:gemini-2.5-flash-lite": {
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.4,
    className: "economy",
  },
  "gemini:gemini-2.5-flash": {
    provider: "gemini",
    model: "gemini-2.5-flash",
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
    className: "premium",
  },
  "openrouter:openai/gpt-4o-mini": {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    inputUsdPerMillion: 0.15,
    outputUsdPerMillion: 0.6,
    className: "fallback",
  },
  "openrouter:google/gemini-2.5-flash-lite": {
    provider: "openrouter",
    model: "google/gemini-2.5-flash-lite",
    inputUsdPerMillion: 0.1,
    outputUsdPerMillion: 0.4,
    className: "fallback",
  },
  "openrouter:google/gemini-2.5-flash": {
    provider: "openrouter",
    model: "google/gemini-2.5-flash",
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
    className: "fallback",
  },
};

export const SERPER_RATE = {
  provider: "serper",
  unit: "query",
  usdPerQuery: 0.0003,
};

export const getUsdToNgnRate = () => {
  const configured = Number(process.env.USD_TO_NGN_RATE);
  return Number.isFinite(configured) && configured > 0 ? configured : 1500;
};

export function resolveRateKey(provider: string, model?: unknown): AiRateKey {
  const normalizedProvider = provider.toLowerCase();
  const normalizedModel = typeof model === "string" ? model.toLowerCase() : "";

  if (normalizedProvider.includes("openrouter")) {
    if (normalizedModel.includes("gemini-2.5-flash") && !normalizedModel.includes("lite")) {
      return "openrouter:google/gemini-2.5-flash";
    }
    if (normalizedModel.includes("gemini")) return "openrouter:google/gemini-2.5-flash-lite";
    return "openrouter:openai/gpt-4o-mini";
  }

  if (
    normalizedProvider.includes("gemini") ||
    normalizedProvider.includes("google") ||
    normalizedProvider.includes("edge:auto") ||
    normalizedProvider.includes("edge:research") ||
    normalizedProvider.includes("edge:study-tools") ||
    normalizedProvider.includes("edge:generate-study-tools")
  ) {
    if (normalizedModel.includes("pro") || normalizedModel.includes("gemini-2.5-flash")) {
      return "gemini:gemini-2.5-flash";
    }
    return "gemini:gemini-2.5-flash-lite";
  }

  return "openai:gpt-4o-mini";
}

export function estimateAiCost({
  provider,
  model,
  promptTokens,
  completionTokens,
  serperQueries = 0,
}: {
  provider: string;
  model?: unknown;
  promptTokens: number;
  completionTokens: number;
  serperQueries?: number;
}) {
  const rateKey = resolveRateKey(provider, model);
  const rate = AI_RATES[rateKey];
  const tokenCostUsd =
    (Math.max(0, promptTokens) / 1_000_000) * rate.inputUsdPerMillion +
    (Math.max(0, completionTokens) / 1_000_000) * rate.outputUsdPerMillion;
  const searchCostUsd = Math.max(0, serperQueries) * SERPER_RATE.usdPerQuery;
  const providerCostUsd = tokenCostUsd + searchCostUsd;
  const marginUsd = providerCostUsd * AI_MARGIN_RATE;
  const billableCostUsd = providerCostUsd + marginUsd;
  const usdToNgn = getUsdToNgnRate();

  return {
    rate_key: rateKey,
    provider: rate.provider,
    model: rate.model,
    class_name: rate.className,
    prompt_tokens: Math.max(0, Math.round(promptTokens)),
    completion_tokens: Math.max(0, Math.round(completionTokens)),
    serper_queries: Math.max(0, Math.round(serperQueries)),
    provider_cost_usd: Number(providerCostUsd.toFixed(6)),
    margin_rate: AI_MARGIN_RATE,
    margin_usd: Number(marginUsd.toFixed(6)),
    billable_cost_usd: Number(billableCostUsd.toFixed(6)),
    billable_cost_kobo: Math.ceil(billableCostUsd * usdToNgn * 100),
    usd_to_ngn_rate: usdToNgn,
  };
}

export function estimatePlanAiCost(providerLimits: Record<string, unknown>) {
  const providers = (providerLimits.providers || {}) as Record<string, { tokens?: number; model?: string }>;
  const searchQueries = Number(providerLimits.serper_queries || 0);
  let providerCostUsd = searchQueries * SERPER_RATE.usdPerQuery;

  for (const [provider, config] of Object.entries(providers)) {
    const tokens = Number(config.tokens || 0);
    const promptTokens = Math.round(tokens * 0.65);
    const completionTokens = Math.round(tokens * 0.35);
    const cost = estimateAiCost({
      provider,
      model: config.model,
      promptTokens,
      completionTokens,
    });
    providerCostUsd += cost.provider_cost_usd;
  }

  const marginUsd = providerCostUsd * AI_MARGIN_RATE;
  const billableCostUsd = providerCostUsd + marginUsd;
  const usdToNgn = getUsdToNgnRate();

  return {
    provider_cost_usd: Number(providerCostUsd.toFixed(6)),
    margin_rate: AI_MARGIN_RATE,
    margin_usd: Number(marginUsd.toFixed(6)),
    billable_cost_usd: Number(billableCostUsd.toFixed(6)),
    billable_cost_kobo: Math.ceil(billableCostUsd * usdToNgn * 100),
    usd_to_ngn_rate: usdToNgn,
  };
}
