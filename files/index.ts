import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { generateOpenApiDocument } from "./docs/openapi";

// Routes
import profilesRouter from "./routes/profiles";
import studentPdfsRouter from "./routes/studentPdfs";
import chatRouter from "./routes/chatMessages";
import aiConversationsRouter from "./routes/aiConversations";
import gpaRouter from "./routes/gpaRecords";
import activityRouter from "./routes/learningActivity";
import newsRouter from "./routes/schoolNews";
import studyPlansRouter from "./routes/studyPlans";
import courseMaterialsRouter from "./routes/courseMaterials";
import researchRouter from "./routes/researchHistory";
import statsRouter from "./routes/userStats";

const app = express();
const PORT = process.env.PORT ?? 3000;

// ── Middleware ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// ── Health ─────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────
app.use("/api/profiles", profilesRouter);
app.use("/api/pdfs", studentPdfsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/ai-conversations", aiConversationsRouter);
app.use("/api/gpa", gpaRouter);
app.use("/api/activity", activityRouter);
app.use("/api/news", newsRouter);
app.use("/api/study-plans", studyPlansRouter);
app.use("/api/course-materials", courseMaterialsRouter);
app.use("/api/research", researchRouter);
app.use("/api/stats", statsRouter);

// ── OpenAPI / Swagger ──────────────────────────────────────
const openApiDocument = generateOpenApiDocument();

app.get("/api-docs/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(openApiDocument);
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customCssUrl: "/swagger-theme.css",
    customSiteTitle: "Your Study Companion API",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// Serve the CSS file statically
app.use(
  "/swagger-theme.css",
  express.static(path.join(__dirname, "docs", "swagger-theme.css"))
);

// ── 404 fallback ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Server running at http://localhost:${PORT}`);
  console.log(`📖  API Docs    →  http://localhost:${PORT}/api-docs`);
  console.log(`🔧  Health      →  http://localhost:${PORT}/health\n`);
});

export default app;
