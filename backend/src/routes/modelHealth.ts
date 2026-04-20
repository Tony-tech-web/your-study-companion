import { Router, Response, Request } from "express";

const router = Router();

/**
 * GET /api/model-health
 * Returns the status and availability of AI providers
 */
router.get("/", async (_req: Request, res: Response) => {
  const health = {
    status: "operational",
    timestamp: new Date().toISOString(),
    providers: [
      {
        name: "OpenAI (GPT-4o)",
        status: process.env.OPENAI_API_KEY ? "connected" : "missing_key",
        latency: "low",
        is_backup: false
      },
      {
        name: "Google Gemini",
        status: process.env.GEMINI_API_KEY ? "connected" : "missing_key",
        latency: "low",
        is_backup: true
      },
      {
        name: "OpenRouter (Fallback)",
        status: process.env.OPEN_ROUTER_API_KEY ? "connected" : "missing_key",
        latency: "medium",
        is_backup: true
      },
      {
        name: "Serper (Research)",
        status: process.env.SERPER_API_KEY ? "connected" : "missing_key",
        latency: "low",
        is_backup: true
      }
    ]
  };

  res.json(health);
});

export default router;
