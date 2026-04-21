import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

// POST /api/research/search — search using Serper API
router.post("/search", authenticate, async (req: AuthRequest, res: Response) => {
  const { query, type = "scholar" } = req.body;
  if (!query) { res.status(400).json({ error: "query is required" }); return; }

  if (!process.env.SERPER_API_KEY) {
    res.status(503).json({ error: "Serper API key not configured" });
    return;
  }

  try {
    const endpoint = type === "scholar" ? "https://google.serper.dev/scholar" : "https://google.serper.dev/search";

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "X-API-KEY": process.env.SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 10 })
    });

    if (!resp.ok) {
      const err: any = await resp.json();
      throw new Error(err.message || "Serper API error");
    }

    const data: any = await resp.json();

    // Normalise results from both scholar and web formats
    const results = (data.organic || []).map((r: any) => ({
      title: r.title || r.name || "",
      link: r.link || r.url || "",
      snippet: r.snippet || r.description || "",
      year: r.year || r.date || null,
      authors: r.authors || null,
      cited_by: r.citedBy || null,
      publication: r.publication || r.source || null,
    }));

    // Save to research history
    const saved = await prisma.researchHistory.create({
      data: {
        query,
        results: JSON.stringify(results),
        ai_summary: null,
        user_id: req.user_id!,
      }
    });

    res.json({ results, history_id: saved.id, total: results.length });
  } catch (err) {
    console.error("[researchSearch] POST /search", err);
    res.status(500).json({ error: "Research search failed", details: String(err) });
  }
});

export default router;
