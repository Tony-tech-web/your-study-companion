import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/auth";

type BillingInterval = "two_weeks" | "monthly" | "yearly" | "custom";

type DefaultPlan = {
  slug: string;
  name: string;
  description: string;
  amount: number;
  interval: BillingInterval;
  aiTokenLimit: number;
  providerLimits: Record<string, number | string>;
  isCustom?: boolean;
  active?: boolean;
};

const router = Router();

const paystackSecret = () => process.env.PAYSTACK_SECRET_KEY || "";

const defaultPlans: DefaultPlan[] = [
  {
    slug: "two-weeks",
    name: "Two Weeks",
    description: "Short learning sprint with Orbit AI usage included.",
    amount: 250000,
    interval: "two_weeks",
    aiTokenLimit: 150000,
    providerLimits: { openai: 80000, gemini: 50000, fallback: 20000 },
  },
  {
    slug: "monthly",
    name: "Monthly",
    description: "Full monthly access for study planning, research, chat, and AI tools.",
    amount: 500000,
    interval: "monthly",
    aiTokenLimit: 400000,
    providerLimits: { openai: 220000, gemini: 130000, fallback: 50000 },
  },
  {
    slug: "yearly",
    name: "Yearly",
    description: "Best value annual access with a larger AI allowance.",
    amount: 5000000,
    interval: "yearly",
    aiTokenLimit: 6000000,
    providerLimits: { openai: 3300000, gemini: 2000000, fallback: 700000 },
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
          provider_limits: plan.providerLimits,
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
          provider_limits: plan.providerLimits,
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

  res.json({
    subscription,
    ai_token_limit: subscription?.plan?.ai_token_limit || 0,
    provider_limits: subscription?.plan?.provider_limits || null,
    tokens_used: null,
    tokens_remaining: null,
    token_metering_enabled: false,
    total_ai_interactions: stats?.total_ai_interactions || 0,
  });
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
