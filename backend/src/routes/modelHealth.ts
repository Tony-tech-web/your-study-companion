import { Router, Response, Request } from "express";

const router = Router();

/**
 * GET /api/model-health
 * Checks actual API provider liveness by pinging each one.
 * Keys are stored in Supabase secrets — we call the Supabase edge function
 * for the real status, and surface it here for the frontend.
 */
router.get("/", async (_req: Request, res: Response) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Build provider list — check each key that IS available on this server
  // The AI keys (OPENROUTER, GEMINI, OPENAI, SERPER) live in Supabase secrets.
  // We do a quick proxy call to Supabase to get real status.

  const providers: Array<{ name: string; status: string; latency: string; is_backup: boolean }> = [];

  const checkProvider = async (
    name: string,
    pingFn: () => Promise<boolean>,
    latency: string,
    is_backup: boolean
  ) => {
    try {
      const ok = await pingFn();
      providers.push({ name, status: ok ? "connected" : "missing_key", latency, is_backup });
    } catch {
      providers.push({ name, status: "missing_key", latency, is_backup });
    }
  };

  // Ping Supabase edge function health-check (this has access to all secrets)
  let edgeStatus: Record<string, boolean> = {};
  if (supabaseUrl && supabaseServiceKey) {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/model-health-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        edgeStatus = await r.json();
      }
    } catch (e) {
      console.error("[modelHealth] edge ping failed:", e);
    }
  }

  // Map edge function results to provider list
  const providerDefs = [
    { name: "OpenAI (GPT-4o)", key: "openai", latency: "low", is_backup: false },
    { name: "Google Gemini", key: "gemini", latency: "low", is_backup: true },
    { name: "OpenRouter (Fallback)", key: "openrouter", latency: "medium", is_backup: true },
    { name: "Serper (Research)", key: "serper", latency: "low", is_backup: true },
  ];

  for (const p of providerDefs) {
    const hasKey = edgeStatus[p.key] ?? false;
    providers.push({ name: p.name, status: hasKey ? "connected" : "missing_key", latency: p.latency, is_backup: p.is_backup });
  }

  res.json({
    status: providers.some(p => p.status === "connected") ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    providers,
  });
});

export default router;
