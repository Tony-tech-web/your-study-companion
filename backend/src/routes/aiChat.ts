import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { estimateTokens, getAiUsageSummary, recordAiUsage } from "../lib/aiUsage";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /api/ai/chat — proxy AI request using backend keys
router.post("/chat", authenticate, async (req: AuthRequest, res: Response) => {
  const { message, history = [], model = "auto" } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }

  const subscription = await prisma.subscription.findFirst({
    where: { user_id: req.user_id!, status: { in: ["trial", "active", "past_due"] } },
    include: { plan: true },
    orderBy: { updated_at: "desc" },
  });
  if (subscription?.plan?.ai_token_limit) {
    const usage = await getAiUsageSummary(req.user_id!, subscription.current_period_start || null);
    if (usage.total_tokens >= subscription.plan.ai_token_limit) {
      res.status(402).json({
        error: "AI token allowance exhausted",
        reply: "Your current Orbit AI allowance has been used. Upgrade or renew your plan to continue.",
      });
      return;
    }
  }

  const systemPrompt = "You are Orbit, a professional academic AI assistant. Be concise, precise, and helpful. Never include model metadata tags. Format responses with clear structure.";

  // Try providers in order: OpenAI -> Gemini -> OpenRouter
  const providers = [];

  if (process.env.OPENAI_API_KEY && (model === "auto" || model === "openai")) {
    providers.push("openai");
  }
  if (process.env.GEMINI_API_KEY && (model === "auto" || model === "gemini")) {
    providers.push("gemini");
  }
  if (process.env.OPEN_ROUTER_API_KEY && (model === "auto" || model === "openrouter")) {
    providers.push("openrouter");
  }

  if (providers.length === 0) {
    res.status(503).json({ error: "No AI providers configured", reply: "No AI API keys configured on the server." });
    return;
  }

  let lastError: any = null;

  for (const provider of providers) {
    try {
      let reply = "";
      let promptTokens = estimateTokens([systemPrompt, ...history.slice(-10), message]);
      let completionTokens = 0;

      if (provider === "openai") {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...history.slice(-10),
              { role: "user", content: message }
            ],
            max_tokens: 1024,
          })
        });
        const data: any = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || "OpenAI error");
        reply = data.choices[0].message.content;
        promptTokens = data.usage?.prompt_tokens || promptTokens;
        completionTokens = data.usage?.completion_tokens || estimateTokens(reply);
      }

      else if (provider === "gemini") {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [
                ...history.slice(-10).map((h: any) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
                { role: "user", parts: [{ text: message }] }
              ]
            })
          }
        );
        const data: any = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || "Gemini error");
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        promptTokens = data.usageMetadata?.promptTokenCount || promptTokens;
        completionTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(reply);
      }

      else if (provider === "openrouter") {
        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
            "HTTP-Referer": "https://orbit.app",
            "X-Title": "Orbit Academic AI"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...history.slice(-10),
              { role: "user", content: message }
            ]
          })
        });
        const data: any = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || "OpenRouter error");
        reply = data.choices[0].message.content;
        promptTokens = data.usage?.prompt_tokens || promptTokens;
        completionTokens = data.usage?.completion_tokens || estimateTokens(reply);
      }

      reply = reply.replace(/\{\{[^}]+\}\}/g, "").trim();
      const usage = await recordAiUsage({
        userId: req.user_id!,
        provider,
        feature: "ai_chat",
        promptTokens,
        completionTokens,
        metadata: { model: provider === "gemini" ? "gemini-2.5-flash-lite" : model },
      });
      res.json({ reply, provider, model: provider, usage });
      return;

    } catch (err) {
      console.error(`[aiChat] ${provider} failed:`, err);
      lastError = err;
      continue; // try next provider
    }
  }

  res.status(503).json({ error: "All AI providers failed", reply: "Neural link timeout. Please try again.", details: String(lastError) });
});

// GET /api/ai/models — return available models
router.get("/models", authenticate, (_req: AuthRequest, res: Response) => {
  const models = [
    { id: "auto", label: "Auto (Best available)", available: true },
    { id: "openai", label: "GPT-4o Mini", available: !!process.env.OPENAI_API_KEY },
    { id: "gemini", label: "Gemini 2.5 Flash-Lite", available: !!process.env.GEMINI_API_KEY },
    { id: "openrouter", label: "OpenRouter", available: !!process.env.OPEN_ROUTER_API_KEY },
  ];
  res.json(models);
});

export default router;
