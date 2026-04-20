import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  ProfileSchema, UpdateProfileSchema,
  StudentPdfSchema, CreateStudentPdfSchema,
  ChatMessageSchema, CreateChatMessageSchema,
  AiConversationSchema, CreateAiConversationSchema,
  GpaRecordSchema, CreateGpaRecordSchema, UpdateGpaRecordSchema,
  LearningActivitySchema, CreateLearningActivitySchema,
  SchoolNewsSchema,
  StudyPlanSchema, CreateStudyPlanSchema, UpdateStudyPlanSchema,
  CourseMaterialSchema, CreateCourseMaterialSchema, UpdateCourseMaterialSchema,
  ResearchHistorySchema, CreateResearchHistorySchema,
  UserStatsSchema, UpdateUserStatsSchema,
  AiChatRequestSchema, AiChatResponseSchema,
  GenerateEmailRequestSchema, GenerateEmailResponseSchema,
  GenerateStudyToolsRequestSchema, GenerateStudyToolsResponseSchema,
  GetStudyTipsRequestSchema, GetStudyTipsResponseSchema,
  ParsePdfRequestSchema, ParsePdfResponseSchema,
  ResearchSearchRequestSchema, ResearchSearchResponseSchema,
  UpdateUserStatsRequestSchema, UpdateUserStatsResponseSchema,
} from "../schemas";

const registry = new OpenAPIRegistry();

// Auth header reusable definition
const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Supabase JWT — copy from your Supabase session token",
});

const security = [{ [bearerAuth.name]: [] }];

const json = (schema: z.ZodTypeAny) => ({
  content: { "application/json": { schema } },
});

const errorResponse = z.object({ error: z.string() });

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/profiles/me", tags: ["Profiles"], security,
  summary: "Get authenticated user's profile",
  responses: {
    200: { description: "Profile data", ...json(ProfileSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "put", path: "/api/profiles/me", tags: ["Profiles"], security,
  summary: "Update authenticated user's profile",
  request: { body: json(UpdateProfileSchema) },
  responses: {
    200: { description: "Updated profile", ...json(ProfileSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// STUDENT PDFs
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/pdfs", tags: ["Student PDFs"], security,
  summary: "List all PDFs belonging to the authenticated user",
  responses: {
    200: { description: "Array of PDFs", ...json(z.array(StudentPdfSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/pdfs", tags: ["Student PDFs"], security,
  summary: "Register a PDF file reference (after uploading to Supabase Storage)",
  request: { body: json(CreateStudentPdfSchema) },
  responses: {
    201: { description: "Created PDF record", ...json(StudentPdfSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/pdfs/{id}", tags: ["Student PDFs"], security,
  summary: "Delete a PDF record",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// CHAT MESSAGES
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/chat", tags: ["Chat"], security,
  summary: "Get messages sent/received by the authenticated user",
  responses: {
    200: { description: "Messages", ...json(z.array(ChatMessageSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/chat", tags: ["Chat"], security,
  summary: "Send a chat message (public broadcast or direct to receiver_id)",
  request: { body: json(CreateChatMessageSchema) },
  responses: {
    201: { description: "Sent message", ...json(ChatMessageSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/chat/{id}", tags: ["Chat"], security,
  summary: "Delete own message",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/ai-conversations", tags: ["AI Conversations"], security,
  summary: "Get AI conversation history for the authenticated user",
  responses: {
    200: { description: "Conversation history", ...json(z.array(AiConversationSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/ai-conversations", tags: ["AI Conversations"], security,
  summary: "Save a new AI conversation message",
  request: { body: json(CreateAiConversationSchema) },
  responses: {
    201: { description: "Saved entry", ...json(AiConversationSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/ai-conversations", tags: ["AI Conversations"], security,
  summary: "Clear all AI conversation history for the authenticated user",
  responses: {
    204: { description: "Cleared" },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/ai-conversations/{id}", tags: ["AI Conversations"], security,
  summary: "Delete a single AI conversation entry",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// GPA RECORDS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/gpa", tags: ["GPA"], security,
  summary: "Get all GPA records for the authenticated user",
  responses: {
    200: { description: "GPA records", ...json(z.array(GpaRecordSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/gpa", tags: ["GPA"], security,
  summary: "Save a new GPA calculation",
  request: { body: json(CreateGpaRecordSchema) },
  responses: {
    201: { description: "Created GPA record", ...json(GpaRecordSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "put", path: "/api/gpa/{id}", tags: ["GPA"], security,
  summary: "Update a GPA record",
  request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateGpaRecordSchema) },
  responses: {
    200: { description: "Updated GPA record", ...json(GpaRecordSchema) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/gpa/{id}", tags: ["GPA"], security,
  summary: "Delete a GPA record",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// LEARNING ACTIVITY
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/activity", tags: ["Learning Activity"], security,
  summary: "Get learning activity log for the authenticated user",
  responses: {
    200: { description: "Activity log", ...json(z.array(LearningActivitySchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/activity", tags: ["Learning Activity"], security,
  summary: "Log a new learning activity",
  request: { body: json(CreateLearningActivitySchema) },
  responses: {
    201: { description: "Logged activity", ...json(LearningActivitySchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// SCHOOL NEWS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/news", tags: ["School News"], security,
  summary: "Get all school news (public to all authenticated users)",
  responses: {
    200: { description: "News list", ...json(z.array(SchoolNewsSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "get", path: "/api/news/{id}", tags: ["School News"], security,
  summary: "Get a single school news item",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "News item", ...json(SchoolNewsSchema) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// STUDY PLANS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/study-plans", tags: ["Study Plans"], security,
  summary: "Get all study plans for the authenticated user",
  responses: {
    200: { description: "Study plans", ...json(z.array(StudyPlanSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/study-plans", tags: ["Study Plans"], security,
  summary: "Create a new study plan",
  request: { body: json(CreateStudyPlanSchema) },
  responses: {
    201: { description: "Created study plan", ...json(StudyPlanSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "put", path: "/api/study-plans/{id}", tags: ["Study Plans"], security,
  summary: "Update a study plan",
  request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateStudyPlanSchema) },
  responses: {
    200: { description: "Updated study plan", ...json(StudyPlanSchema) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/study-plans/{id}", tags: ["Study Plans"], security,
  summary: "Delete a study plan",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// COURSE MATERIALS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/course-materials", tags: ["Course Materials"], security,
  summary: "Get all course materials for the authenticated user",
  responses: {
    200: { description: "Course materials", ...json(z.array(CourseMaterialSchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "get", path: "/api/course-materials/{id}", tags: ["Course Materials"], security,
  summary: "Get a single course material",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Course material", ...json(CourseMaterialSchema) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/course-materials", tags: ["Course Materials"], security,
  summary: "Create a course material record",
  request: { body: json(CreateCourseMaterialSchema) },
  responses: {
    201: { description: "Created", ...json(CourseMaterialSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "put", path: "/api/course-materials/{id}", tags: ["Course Materials"], security,
  summary: "Update a course material",
  request: { params: z.object({ id: z.string().uuid() }), body: json(UpdateCourseMaterialSchema) },
  responses: {
    200: { description: "Updated", ...json(CourseMaterialSchema) },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/course-materials/{id}", tags: ["Course Materials"], security,
  summary: "Delete a course material",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// RESEARCH HISTORY
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/research", tags: ["Research"], security,
  summary: "Get research history for the authenticated user",
  responses: {
    200: { description: "Research history", ...json(z.array(ResearchHistorySchema)) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "post", path: "/api/research", tags: ["Research"], security,
  summary: "Save a research query and results",
  request: { body: json(CreateResearchHistorySchema) },
  responses: {
    201: { description: "Saved", ...json(ResearchHistorySchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "delete", path: "/api/research/{id}", tags: ["Research"], security,
  summary: "Delete a research history entry",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    204: { description: "Deleted" },
    404: { description: "Not found", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// USER STATS
// ─────────────────────────────────────────────
registry.registerPath({
  method: "get", path: "/api/stats/me", tags: ["User Stats"], security,
  summary: "Get stats for the authenticated user (auto-creates if not found)",
  responses: {
    200: { description: "User stats", ...json(UserStatsSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "put", path: "/api/stats/me", tags: ["User Stats"], security,
  summary: "Update user stats (upserts)",
  request: { body: json(UpdateUserStatsSchema) },
  responses: {
    200: { description: "Updated stats", ...json(UserStatsSchema) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

registry.registerPath({
  method: "get", path: "/api/stats/leaderboard", tags: ["User Stats"], security,
  summary: "Get top 20 users by XP points",
  responses: {
    200: { description: "Leaderboard", ...json(z.array(UserStatsSchema.partial())) },
    401: { description: "Unauthorized", ...json(errorResponse) },
  },
});

// ─────────────────────────────────────────────
// EDGE FUNCTIONS (documentation only)
// ─────────────────────────────────────────────
registry.registerPath({
  method: "post", path: "/edge/ai-chat", tags: ["Edge Functions"], security,
  summary: "[Edge] Context-aware AI tutor chat with optional PDF context",
  request: { body: json(AiChatRequestSchema) },
  responses: { 200: { description: "AI reply", ...json(AiChatResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/generate-email", tags: ["Edge Functions"], security,
  summary: "[Edge] Generate a unique @elizadeuniversity.edu.ng email address",
  request: { body: json(GenerateEmailRequestSchema) },
  responses: { 200: { description: "Generated email", ...json(GenerateEmailResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/generate-study-tools", tags: ["Edge Functions"], security,
  summary: "[Edge] Generate flashcards, quiz, or summary from a PDF",
  request: { body: json(GenerateStudyToolsRequestSchema) },
  responses: { 200: { description: "Generated tools", ...json(GenerateStudyToolsResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/get-study-tips", tags: ["Edge Functions"], security,
  summary: "[Edge] Generate personalised study tips based on user habits",
  request: { body: json(GetStudyTipsRequestSchema) },
  responses: { 200: { description: "Study tips", ...json(GetStudyTipsResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/parse-pdf", tags: ["Edge Functions"], security,
  summary: "[Edge] Extract text content from an uploaded PDF",
  request: { body: json(ParsePdfRequestSchema) },
  responses: { 200: { description: "Parsed content", ...json(ParsePdfResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/research-search", tags: ["Edge Functions"], security,
  summary: "[Edge] Search Google Scholar via Serper API and return AI summary",
  request: { body: json(ResearchSearchRequestSchema) },
  responses: { 200: { description: "Search results", ...json(ResearchSearchResponseSchema) } },
});

registry.registerPath({
  method: "post", path: "/edge/update-user-stats", tags: ["Edge Functions"], security,
  summary: "[Edge] Safely increment study minutes and XP points",
  request: { body: json(UpdateUserStatsRequestSchema) },
  responses: { 200: { description: "Updated stats", ...json(UpdateUserStatsResponseSchema) } },
});

// ─────────────────────────────────────────────
// GENERATE SPEC
// ─────────────────────────────────────────────
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Your Study Companion API",
      version: "1.0.0",
      description:
        "REST API powering Your Study Companion — a student platform built on Express + Prisma + PostgreSQL with Supabase Auth & Edge Functions.",
    },
    servers: [
      { url: "http://localhost:3000", description: "Local development" },
    ],
    tags: [
      { name: "Profiles", description: "User profile management" },
      { name: "Student PDFs", description: "PDF file metadata" },
      { name: "Chat", description: "Student-to-student messaging" },
      { name: "AI Conversations", description: "AI tutor conversation history" },
      { name: "GPA", description: "GPA records and calculations" },
      { name: "Learning Activity", description: "Study activity tracking" },
      { name: "School News", description: "School announcements" },
      { name: "Study Plans", description: "Study schedule management" },
      { name: "Course Materials", description: "Course-linked PDF study tools" },
      { name: "Research", description: "Academic research history" },
      { name: "User Stats", description: "XP, streaks, and leaderboard" },
      { name: "Edge Functions", description: "Supabase Edge — AI & compute tasks (documented for reference)" },
    ],
  });
}
