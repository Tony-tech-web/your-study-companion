import { Router, Request, Response } from "express";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getAiUsageSummary, recordAiUsage } from "../lib/aiUsage";
import { AI_MARGIN_RATE, AI_RATES, SERPER_RATE, estimatePlanAiCost } from "../lib/aiPricing";

type BillingInterval = "two_weeks" | "monthly" | "yearly" | "custom";

type DefaultPlan = {
  slug: string;
  name: string;
  description: string;
  amount: number;
  interval: BillingInterval;
  aiTokenLimit: number;
  providerLimits: Record<string, unknown>;
  isCustom?: boolean;
  active?: boolean;
};

const router = Router();

const paystackSecret = () => process.env.PAYSTACK_SECRET_KEY || "";

const withOwnerMargin = (baseKobo: number) => Math.ceil(baseKobo * (1 + AI_MARGIN_RATE));

function aiMix(
  profile: string,
  providers: Record<string, { model: string; tokens: number; role: string }>,
  serperQueries: number,
) {
  const mix = {
    profile,
    owner_margin_rate: AI_MARGIN_RATE,
    rates: AI_RATES,
    serper: SERPER_RATE,
    providers,
    serper_queries: serperQueries,
    routing: {
      chat: ["gemini:gemini-2.5-flash-lite", "openai:gpt-4o-mini", "openrouter:openai/gpt-4o-mini"],
      teach: ["gemini:gemini-2.5-flash-lite", "openai:gpt-4o-mini"],
      test: ["gemini:gemini-2.5-flash-lite", "openai:gpt-4o-mini"],
      planner: ["gemini:gemini-2.5-flash-lite", "openai:gpt-4o-mini"],
      research: ["serper", "gemini:gemini-2.5-flash-lite", "openrouter:google/gemini-2.5-flash-lite"],
      study_tools: ["gemini:gemini-2.5-flash-lite", "openrouter:google/gemini-2.5-flash-lite"],
    },
  };

  return { ...mix, estimate: estimatePlanAiCost(mix) };
}

const defaultPlans: DefaultPlan[] = [
  {
    slug: "two-weeks",
    name: "Two Weeks",
    description: "Short learning sprint with Orbit AI usage included.",
    amount: withOwnerMargin(250000),
    interval: "two_weeks",
    aiTokenLimit: 150000,
    providerLimits: aiMix("focused_sprint", {
      gemini: { model: "gemini-2.5-flash-lite", tokens: 90000, role: "daily chat, planner, study tools" },
      openai: { model: "gpt-4o-mini", tokens: 45000, role: "higher precision fallback" },
      openrouter: { model: "openai/gpt-4o-mini", tokens: 15000, role: "routing fallback" },
    }, 120),
  },
  {
    slug: "monthly",
    name: "Monthly",
    description: "Full monthly access for study planning, research, chat, and AI tools.",
    amount: withOwnerMargin(500000),
    interval: "monthly",
    aiTokenLimit: 400000,
    providerLimits: aiMix("balanced_monthly", {
      gemini: { model: "gemini-2.5-flash-lite", tokens: 240000, role: "primary low-latency tutoring and planner generation" },
      openai: { model: "gpt-4o-mini", tokens: 110000, role: "structured academic explanations" },
      openrouter: { model: "openai/gpt-4o-mini", tokens: 50000, role: "provider fallback" },
    }, 350),
  },
  {
    slug: "all-round",
    name: "All Round",
    description: "Expanded balanced pool across chat, research, planner, study tools, and fallback routing.",
    amount: withOwnerMargin(850000),
    interval: "monthly",
    aiTokenLimit: 900000,
    providerLimits: aiMix("all_round", {
      gemini: { model: "gemini-2.5-flash-lite", tokens: 450000, role: "high-volume learning, study tools, planner" },
      openai: { model: "gpt-4o-mini", tokens: 300000, role: "premium explanation, code, and research synthesis" },
      openrouter: { model: "openai/gpt-4o-mini", tokens: 150000, role: "resilient fallback and overflow" },
    }, 900),
  },
  {
    slug: "yearly",
    name: "Yearly",
    description: "Best value annual access with a larger AI allowance.",
    amount: withOwnerMargin(5000000),
    interval: "yearly",
    aiTokenLimit: 6000000,
    providerLimits: aiMix("annual_all_round", {
      gemini: { model: "gemini-2.5-flash-lite", tokens: 3200000, role: "daily high-volume learning" },
      openai: { model: "gpt-4o-mini", tokens: 1900000, role: "premium academic and code work" },
      openrouter: { model: "openai/gpt-4o-mini", tokens: 900000, role: "fallback and overflow" },
    }, 6000),
  },
  {
    slug: "custom",
    name: "Custom",
    description: "Campus, department, and enterprise plans are coming soon.",
    amount: 0,
    interval: "custom",
    aiTokenLimit: 0,
    providerLimits: { status: "coming_soon" },
    isCustom: true,
    active: false,
  },
];

const paystackPlanEnv: Record<string, string | undefined> = {
  "two-weeks": process.env.PAYSTACK_PLAN_TWO_WEEKS,
  monthly: process.env.PAYSTACK_PLAN_MONTHLY,
  yearly: process.env.PAYSTACK_PLAN_YEARLY,
};

function periodEnd(interval: BillingInterval, start = new Date()) {
  const end = new Date(start);
  if (interval === "two_weeks") end.setDate(end.getDate() + 14);
  if (interval === "monthly") end.setMonth(end.getMonth() + 1);
  if (interval === "yearly") end.setFullYear(end.getFullYear() + 1);
  return end;
}

function verifyPaystackSignature(req: Request) {
  const secret = paystackSecret();
  const signature = req.headers["x-paystack-signature"];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!secret || !signature || !rawBody) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(signature)));
}

async function ensurePlans() {
  return Promise.all(
    defaultPlans.map((plan) =>
      prisma.billingPlan.upsert({
        where: { slug: plan.slug },
        update: {
          name: plan.name,
          description: plan.description,
          price_kobo: plan.amount,
          currency: "NGN",
          billing_interval: plan.interval,
          ai_token_limit: plan.aiTokenLimit,
          provider_limits: plan.providerLimits as Prisma.InputJsonValue,
          paystack_plan_code: paystackPlanEnv[plan.slug] || undefined,
          is_custom: Boolean(plan.isCustom),
          is_active: plan.active ?? true,
        },
        create: {
          slug: plan.slug,
          name: plan.name,
          description: plan.description,
          price_kobo: plan.amount,
          currency: "NGN",
          billing_interval: plan.interval,
          ai_token_limit: plan.aiTokenLimit,
          provider_limits: plan.providerLimits as Prisma.InputJsonValue,
          paystack_plan_code: paystackPlanEnv[plan.slug] || null,
          is_custom: Boolean(plan.isCustom),
          is_active: plan.active ?? true,
        },
      })
    )
  );
}

async function resolveUserId(data: any) {
  const metadataUserId = data?.metadata?.user_id;
  if (metadataUserId) return String(metadataUserId);

  const email = data?.customer?.email || data?.customer?.customer_email;
  if (!email) return null;

  const profile = await prisma.profile.findFirst({ where: { email } });
  return profile?.user_id || null;
}

async function resolvePlan(data: any) {
  const slug = data?.metadata?.plan_slug;
  if (slug) {
    const plan = await prisma.billingPlan.findUnique({ where: { slug: String(slug) } });
    if (plan) return plan;
  }

  const planCode = data?.plan?.plan_code || data?.subscription?.plan?.plan_code || data?.plan_code;
  if (planCode) {
    const plan = await prisma.billingPlan.findFirst({ where: { paystack_plan_code: String(planCode) } });
    if (plan) return plan;
  }

  return null;
}

async function activateSubscriptionFromPaystack(data: any) {
  const [userId, plan] = await Promise.all([resolveUserId(data), resolvePlan(data)]);
  if (!userId || !plan) return null;

  const paidAt = data?.paid_at ? new Date(data.paid_at) : new Date();
  const reference = data?.reference ? String(data.reference) : `paystack_${Date.now()}`;
  const subscriptionCode = data?.subscription?.subscription_code || data?.subscription_code || null;
  const emailToken = data?.authorization?.authorization_code || data?.email_token || null;

  const subscription = await prisma.subscription.upsert({
    where: { paystack_subscription_code: subscriptionCode || `manual:${reference}` },
    update: {
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      current_period_start: paidAt,
      current_period_end: periodEnd(plan.billing_interval as BillingInterval, paidAt),
      cancel_at_period_end: false,
      paystack_email_token: emailToken,
    },
    create: {
      user_id: userId,
      plan_id: plan.id,
      status: "active",
      paystack_subscription_code: subscriptionCode || `manual:${reference}`,
      paystack_email_token: emailToken,
      current_period_start: paidAt,
      current_period_end: periodEnd(plan.billing_interval as BillingInterval, paidAt),
    },
  });

  await prisma.payment.upsert({
    where: { provider_reference: reference },
    update: {
      user_id: userId,
      subscription_id: subscription.id,
      plan_id: plan.id,
      amount_kobo: Number(data?.amount || plan.price_kobo),
      currency: data?.currency || plan.currency,
      status: data?.status || "success",
      paid_at: paidAt,
      raw: data,
    },
    create: {
      user_id: userId,
      subscription_id: subscription.id,
      plan_id: plan.id,
      provider: "paystack",
      provider_reference: reference,
      amount_kobo: Number(data?.amount || plan.price_kobo),
      currency: data?.currency || plan.currency,
      status: data?.status || "success",
      paid_at: paidAt,
      raw: data,
    },
  });

  return subscription;
}

router.get("/plans", async (_req: Request, res: Response) => {
  const plans = await ensurePlans();
  res.json({
    plans: plans
      .sort((a, b) => a.price_kobo - b.price_kobo)
      .map((plan) => ({
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        amount: plan.price_kobo,
        currency: plan.currency,
        interval: plan.billing_interval,
        ai_token_limit: plan.ai_token_limit,
        provider_limits: plan.provider_limits,
        is_custom: plan.is_custom,
        active: plan.is_active,
      })),
  });
});

router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user_id!;
  const subscription = await prisma.subscription.findFirst({
    where: { user_id: userId },
    include: { plan: true },
    orderBy: { updated_at: "desc" },
  });
  const payments = await prisma.payment.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 8,
  });
  const invoices = await prisma.invoice.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    take: 8,
  });

  res.json({ subscription, payments, invoices });
});

router.get("/usage", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user_id!;
  const [subscription, stats] = await Promise.all([
    prisma.subscription.findFirst({
      where: { user_id: userId, status: { in: ["trial", "active", "past_due"] } },
      include: { plan: true },
      orderBy: { updated_at: "desc" },
    }),
    prisma.userStats.findUnique({ where: { user_id: userId } }),
  ]);
  const usage = await getAiUsageSummary(userId, subscription?.current_period_start || null);
  const tokenLimit = subscription?.plan?.ai_token_limit || 0;

  res.json({
    subscription,
    ai_token_limit: tokenLimit,
    provider_limits: subscription?.plan?.provider_limits || null,
    tokens_used: usage.total_tokens,
    tokens_remaining: tokenLimit > 0 ? Math.max(0, tokenLimit - usage.total_tokens) : null,
    token_metering_enabled: true,
    usage,
    total_ai_interactions: stats?.total_ai_interactions || 0,
  });
});

router.post("/usage-events", authenticate, async (req: AuthRequest, res: Response) => {
  const {
    provider = "unknown",
    feature = "ai",
    prompt_tokens = 0,
    completion_tokens = 0,
    total_tokens,
    metadata,
  } = req.body || {};

  const total = Number(total_tokens);
  const prompt = Number(prompt_tokens);
  const completion = Number(completion_tokens);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const event = await recordAiUsage({
    userId: req.user_id!,
    provider: String(provider).slice(0, 60),
    feature: String(feature).slice(0, 80),
    promptTokens: Number.isFinite(prompt) && prompt > 0 ? prompt : Math.max(0, Math.floor(safeTotal * 0.65)),
    completionTokens: Number.isFinite(completion) && completion > 0 ? completion : Math.max(0, Math.ceil(safeTotal * 0.35)),
    metadata: metadata && typeof metadata === "object" ? metadata : undefined,
  });

  res.status(201).json({ event });
});

router.post("/checkout", authenticate, async (req: AuthRequest, res: Response) => {
  const secret = paystackSecret();
  if (!secret) {
    return res.status(503).json({ error: "Paystack is not configured on the server." });
  }

  const userId = req.user_id!;
  const userEmail = req.user_email;
  const { planSlug, callbackUrl } = req.body || {};
  const plans = await ensurePlans();
  const plan = plans.find((item) => item.slug === planSlug);

  if (!plan || !plan.is_active) return res.status(404).json({ error: "Plan not found." });
  if (plan.is_custom) return res.status(400).json({ error: "Custom plans are coming soon." });

  const profile = await prisma.profile.findUnique({ where: { user_id: userId } });
  const email = userEmail || profile?.email;
  if (!email) return res.status(400).json({ error: "A verified email is required for billing." });

  const reference = `orbit_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const payload: Record<string, any> = {
    email,
    amount: plan.price_kobo,
    currency: plan.currency,
    reference,
    callback_url: callbackUrl,
    metadata: {
      user_id: userId,
      plan_slug: plan.slug,
      billing_interval: plan.billing_interval,
    },
  };

  if (plan.paystack_plan_code) payload.plan = plan.paystack_plan_code;

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body: any = await response.json();

  if (!response.ok || !body.status) {
    return res.status(502).json({ error: body.message || "Unable to initialize Paystack checkout." });
  }

  await prisma.payment.create({
    data: {
      user_id: userId,
      provider: "paystack",
      provider_reference: reference,
      plan_id: plan.id,
      amount_kobo: plan.price_kobo,
      currency: plan.currency,
      status: "pending",
      raw: body,
    },
  });

  res.json({
    authorizationUrl: body.data.authorization_url,
    accessCode: body.data.access_code,
    reference,
  });
});

router.post("/verify/:reference", authenticate, async (req: AuthRequest, res: Response) => {
  const secret = paystackSecret();
  if (!secret) return res.status(503).json({ error: "Paystack is not configured on the server." });

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body: any = await response.json();

  if (!response.ok || !body.status || body.data?.status !== "success") {
    return res.status(400).json({ error: body.message || "Payment has not been confirmed." });
  }

  const subscription = await activateSubscriptionFromPaystack(body.data);
  res.json({ subscription });
});

router.post("/webhook", async (req: Request, res: Response) => {
  if (!verifyPaystackSignature(req)) return res.status(401).json({ error: "Invalid Paystack signature." });

  const event = req.body;
  const data = event?.data || {};
  const providerEventId = `${event?.event || "unknown"}:${data.reference || data.subscription_code || data.invoice_code || Date.now()}`;

  try {
    await prisma.paymentEvent.create({
      data: {
        provider: "paystack",
        provider_event_id: providerEventId,
        event_type: event?.event || "unknown",
        raw: event,
      },
    });
  } catch {
    return res.json({ received: true, duplicate: true });
  }

  if (event.event === "charge.success") {
    await activateSubscriptionFromPaystack(data);
  }

  if (event.event === "subscription.disable") {
    const code = data?.subscription_code || data?.subscription?.subscription_code;
    if (code) {
      await prisma.subscription.updateMany({
        where: { paystack_subscription_code: String(code) },
        data: { status: "cancelled", cancel_at_period_end: true },
      });
    }
  }

  if (event.event === "invoice.create") {
    const userId = await resolveUserId(data);
    if (userId) {
      const subscription = data?.subscription?.subscription_code
        ? await prisma.subscription.findFirst({
            where: { paystack_subscription_code: String(data.subscription.subscription_code) },
          })
        : null;

      await prisma.invoice.upsert({
        where: { provider_invoice_code: String(data.invoice_code || providerEventId) },
        update: { status: data.status || "pending", raw: data },
        create: {
          user_id: userId,
          subscription_id: subscription?.id,
          provider_invoice_code: String(data.invoice_code || providerEventId),
          amount_kobo: Number(data.amount || 0),
          currency: data.currency || "NGN",
          status: data.status || "pending",
          due_at: data.due_date ? new Date(data.due_date) : null,
          raw: data,
        },
      });
    }
  }

  res.json({ received: true });
});

export default router;
