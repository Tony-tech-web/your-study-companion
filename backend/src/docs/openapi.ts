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
  GenerateStudyToolsRequestSchema, GenerateStudyToolsResponseSchema,
  GetStudyTipsRequestSchema, GetStudyTipsResponseSchema,
  ParsePdfRequestSchema, ParsePdfResponseSchema,
  ResearchSearchRequestSchema, ResearchSearchResponseSchema,
  UpdateUserStatsRequestSchema, UpdateUserStatsResponseSchema,
} from "../schemas";

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "Supabase JWT — copy from your Supabase session token",
});

const security = [{ [bearerAuth.name]: [] }];
const json = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });
const errorResponse = z.object({ error: z.string() });

// Health
registry.registerPath({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: z.object({ status: z.string(), timestamp: z.string() }) } },
    },
  },
});

// Auth
registry.registerPath({
  method: "post",
  path: "/api/auth/login",
  tags: ["Auth"],
  summary: "Login",
  description: "Authenticate with email and password to receive a Supabase JWT.",
  request: {
    body: json(z.object({
      email: z.string().describe("Your account email address OR your unique username"),
      password: z.string().min(6).describe("Your secure account password")
    }))
  },
  responses: {
    200: {
      description: "Login successful",
      ...json(z.object({
        access_token: z.string(),
        token_type: z.string(),
        expires_in: z.number(),
        refresh_token: z.string(),
        user: z.any()
      }))
    },
    401: { description: "Invalid credentials", ...json(errorResponse) }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/auth/signup",
  tags: ["Auth"],
  summary: "Register",
  description: "Create a new student account.",
  request: {
    body: json(z.object({
      email: z.string().email().describe("Mandatory university email: firstname.surname@elizadeuniversity.edu.ng"),
      username: z.string().min(3).describe("Unique username for the platform"),
      password: z.string().min(6).describe("Password must be at least 6 characters long"),
      full_name: z.string(),
      matric_number: z.string(),
      phone_number: z.string()
    }))
  },
  responses: {
    201: { description: "User created", ...json(z.object({ user: z.any(), session: z.any().nullable() })) },
    400: { description: "Registration failed", ...json(errorResponse) }
  }
});

// Profiles
registry.registerPath({ method: "get", path: "/api/profiles", tags: ["Profiles"], security, summary: "List all students", description: "Fetch the global student directory.", responses: { 200: { description: "Profiles", ...json(z.array(ProfileSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "get", path: "/api/profiles/me", tags: ["Profiles"], security, summary: "Get my profile", description: "Fetch the authenticated user's profile details.", responses: { 200: { description: "Profile", ...json(ProfileSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "put", path: "/api/profiles/me", tags: ["Profiles"], security, summary: "Update my profile", description: "Update the authenticated user's profile fields.", request: { body: json(UpdateProfileSchema) }, responses: { 200: { description: "Updated", ...json(ProfileSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });

// Student PDFs
registry.registerPath({ method: "get", path: "/api/pdfs", tags: ["Student PDFs"], security, summary: "List my PDFs", description: "Retrieve all PDF metadata uploaded by the current user.", responses: { 200: { description: "PDFs", ...json(z.array(StudentPdfSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/pdfs", tags: ["Student PDFs"], security, summary: "Register a PDF", description: "Register a new PDF upload in the database after uploading to Supabase Storage.", request: { body: json(CreateStudentPdfSchema) }, responses: { 201: { description: "Created", ...json(StudentPdfSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/pdfs/{id}", tags: ["Student PDFs"], security, summary: "Delete a PDF record", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the PDF record") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// Chat
registry.registerPath({ method: "get", path: "/api/chat", tags: ["Chat"], security, summary: "Get chat messages", description: "Fetch peer-to-peer or system messages for the current user.", responses: { 200: { description: "Messages", ...json(z.array(ChatMessageSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/chat", tags: ["Chat"], security, summary: "Send a message", description: "Send a new message to another user or a group.", request: { body: json(CreateChatMessageSchema) }, responses: { 201: { description: "Sent", ...json(ChatMessageSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });

// AI Conversations
registry.registerPath({ method: "get", path: "/api/ai-conversations", tags: ["AI Conversations"], security, summary: "Get AI conversation history", description: "Retrieve the full chat history with the AI Tutor.", responses: { 200: { description: "History", ...json(z.array(AiConversationSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/ai-conversations", tags: ["AI Conversations"], security, summary: "Save AI message", description: "Save a new user or assistant message to the conversation history.", request: { body: json(CreateAiConversationSchema) }, responses: { 201: { description: "Saved", ...json(AiConversationSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/ai-conversations", tags: ["AI Conversations"], security, summary: "Clear AI history", description: "Delete all AI conversation records for the authenticated user.", responses: { 204: { description: "Cleared" }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/ai-conversations/{id}", tags: ["AI Conversations"], security, summary: "Delete a single AI message", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the conversation entry") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// GPA
registry.registerPath({ method: "get", path: "/api/gpa", tags: ["GPA"], security, summary: "List GPA records", description: "Retrieve all saved GPA calculation records.", responses: { 200: { description: "Records", ...json(z.array(GpaRecordSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/gpa", tags: ["GPA"], security, summary: "Save a GPA record", description: "Save a new GPA calculation (courses, credits, and results).", request: { body: json(CreateGpaRecordSchema) }, responses: { 201: { description: "Saved", ...json(GpaRecordSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/gpa/{id}", tags: ["GPA"], security, summary: "Delete a GPA record", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the GPA record") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// Learning Activity
registry.registerPath({ method: "get", path: "/api/activity", tags: ["Learning Activity"], security, summary: "Get my learning activity", description: "Retrieve the user's logged activity for heatmaps and stats.", responses: { 200: { description: "Activity", ...json(z.array(LearningActivitySchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/activity", tags: ["Learning Activity"], security, summary: "Log a learning activity", description: "Log a new action (e.g., 'quiz_completed', 'pdf_scanned').", request: { body: json(CreateLearningActivitySchema) }, responses: { 201: { description: "Logged", ...json(LearningActivitySchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });

// School News
registry.registerPath({ method: "get", path: "/api/news", tags: ["School News"], summary: "List school news", description: "Fetch public school news and announcements.", responses: { 200: { description: "News", ...json(z.array(SchoolNewsSchema)) } } });
registry.registerPath({ method: "post", path: "/api/news", tags: ["School News"], security, summary: "Create a news item", description: "Admin-only: Publish a new school announcement.", request: { body: json(SchoolNewsSchema.omit({ id: true, published_at: true, created_at: true })) }, responses: { 201: { description: "Created", ...json(SchoolNewsSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });

// Study Plans
registry.registerPath({ method: "get", path: "/api/study-plans", tags: ["Study Plans"], security, summary: "List study plans", description: "Retrieve all study plans created by the user.", responses: { 200: { description: "Plans", ...json(z.array(StudyPlanSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/study-plans", tags: ["Study Plans"], security, summary: "Create a study plan", description: "Create a new personalised study plan.", request: { body: json(CreateStudyPlanSchema) }, responses: { 201: { description: "Created", ...json(StudyPlanSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "put", path: "/api/study-plans/{id}", tags: ["Study Plans"], security, summary: "Update a study plan", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the study plan") }), body: json(UpdateStudyPlanSchema) }, responses: { 200: { description: "Updated", ...json(StudyPlanSchema) }, 404: { description: "Not found", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/study-plans/{id}", tags: ["Study Plans"], security, summary: "Delete a study plan", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the study plan") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// Course Materials
registry.registerPath({ method: "get", path: "/api/course-materials", tags: ["Course Materials"], security, summary: "List course materials", description: "Retrieve all study materials generated from PDFs.", responses: { 200: { description: "Materials", ...json(z.array(CourseMaterialSchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/course-materials", tags: ["Course Materials"], security, summary: "Create course material", description: "Save a new processed course material entry.", request: { body: json(CreateCourseMaterialSchema) }, responses: { 201: { description: "Created", ...json(CourseMaterialSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "put", path: "/api/course-materials/{id}", tags: ["Course Materials"], security, summary: "Update course material", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the material") }), body: json(UpdateCourseMaterialSchema) }, responses: { 200: { description: "Updated", ...json(CourseMaterialSchema) }, 404: { description: "Not found", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/course-materials/{id}", tags: ["Course Materials"], security, summary: "Delete course material", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the material") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// Research
registry.registerPath({ method: "get", path: "/api/research", tags: ["Research"], security, summary: "List research history", description: "Retrieve all past scholar research searches and AI summaries.", responses: { 200: { description: "History", ...json(z.array(ResearchHistorySchema)) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "post", path: "/api/research", tags: ["Research"], security, summary: "Save research entry", description: "Save a new research query and its results.", request: { body: json(CreateResearchHistorySchema) }, responses: { 201: { description: "Saved", ...json(ResearchHistorySchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "delete", path: "/api/research/{id}", tags: ["Research"], security, summary: "Delete research entry", request: { params: z.object({ id: z.string().uuid().describe("The unique ID of the research entry") }) }, responses: { 204: { description: "Deleted" }, 404: { description: "Not found", ...json(errorResponse) } } });

// History (Consolidated)
registry.registerPath({
  method: "get",
  path: "/api/history",
  tags: ["History"],
  security,
  summary: "Get consolidated history",
  description: "Retrieve a unified timeline of all student activities (AI, GPA, Research, Course Materials).",
  responses: {
    200: {
      description: "Timeline",
      ...json(z.array(z.object({
        id: z.string(),
        type: z.string(),
        title: z.string(),
        content: z.string().nullable(),
        date: z.string(),
        icon: z.string()
      })))
    },
    401: { description: "Unauthorized", ...json(errorResponse) }
  }
});

// Model Health
registry.registerPath({
  method: "get",
  path: "/api/model-health",
  tags: ["System"],
  summary: "AI Model Health Status",
  description: "Check the operational status and connection of OpenAI, Gemini, and OpenRouter providers.",
  responses: {
    200: {
      description: "Health Report",
      ...json(z.object({
        status: z.string(),
        timestamp: z.string(),
        providers: z.array(z.object({
          name: z.string(),
          status: z.string(),
          latency: z.string(),
          is_backup: z.boolean()
        }))
      }))
    }
  }
});

// User Stats
registry.registerPath({ method: "get", path: "/api/stats/me", tags: ["User Stats"], security, summary: "Get my study stats", description: "Fetch XP, level, and study time for the current user.", responses: { 200: { description: "Stats", ...json(UserStatsSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({ method: "put", path: "/api/stats/me", tags: ["User Stats"], security, summary: "Update my study stats", description: "Update or increment user progress stats.", request: { body: json(UpdateUserStatsSchema) }, responses: { 200: { description: "Updated", ...json(UserStatsSchema) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });
registry.registerPath({
  method: "post",
  path: "/api/stats/pulse",
  tags: ["User Stats"],
  security,
  summary: "Study Pulse Heartbeat",
  description: "Record active study time and award XP based on GPA multipliers.",
  request: { body: json(z.object({ activity_type: z.string().optional() })) },
  responses: {
    200: {
      description: "Heartbeat processed",
      ...json(z.object({
        success: z.boolean(),
        xp_earned: z.number(),
        multiplier: z.number(),
        stats: z.any()
      }))
    },
    401: { description: "Unauthorized", ...json(errorResponse) }
  }
});
registry.registerPath({ method: "get", path: "/api/stats/leaderboard", tags: ["User Stats"], security, summary: "Get global leaderboard", description: "Fetch the top 50 users by XP points.", responses: { 200: { description: "Leaderboard", ...json(z.array(UserStatsSchema.partial())) }, 401: { description: "Unauthorized", ...json(errorResponse) } } });

// Edge Functions (documentation only)
registry.registerPath({ method: "post", path: "/edge/ai-chat", tags: ["Edge Functions"], security, summary: "[Edge] AI tutor chat", description: "Interface with the Supabase Edge Function for AI-driven chat.", request: { body: json(AiChatRequestSchema) }, responses: { 200: { description: "AI reply", ...json(AiChatResponseSchema) } } });
registry.registerPath({ method: "post", path: "/edge/generate-study-tools", tags: ["Edge Functions"], security, summary: "[Edge] Generate study tools", description: "Call the edge function to create flashcards, summaries, or quizzes.", request: { body: json(GenerateStudyToolsRequestSchema) }, responses: { 200: { description: "Tools", ...json(GenerateStudyToolsResponseSchema) } } });
registry.registerPath({ method: "post", path: "/edge/get-study-tips", tags: ["Edge Functions"], security, summary: "[Edge] Personalised study tips", description: "Get AI-generated study advice based on user behavior.", request: { body: json(GetStudyTipsRequestSchema) }, responses: { 200: { description: "Tips", ...json(GetStudyTipsResponseSchema) } } });
registry.registerPath({ method: "post", path: "/edge/parse-pdf", tags: ["Edge Functions"], security, summary: "[Edge] Parse PDF content", description: "Extract text and structured data from a PDF via Edge OCR.", request: { body: json(ParsePdfRequestSchema) }, responses: { 200: { description: "Content", ...json(ParsePdfResponseSchema) } } });
registry.registerPath({ method: "post", path: "/edge/research-search", tags: ["Edge Functions"], security, summary: "[Edge] Scholar search", description: "Perform an AI-powered scholar search via the Edge Function.", request: { body: json(ResearchSearchRequestSchema) }, responses: { 200: { description: "Results", ...json(ResearchSearchResponseSchema) } } });
registry.registerPath({ method: "post", path: "/edge/update-user-stats", tags: ["Edge Functions"], security, summary: "[Edge] Increment XP/study time", description: "Notify the edge function to update user statistics.", request: { body: json(UpdateUserStatsRequestSchema) }, responses: { 200: { description: "Updated", ...json(UpdateUserStatsResponseSchema) } } });

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Your Study Companion API",
      version: "1.0.0",
      description: "REST API powering Your Study Companion — Express + Prisma + Supabase Auth.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local development" }],
    tags: [
      { name: "Auth", description: "Authentication & Registration" },
      { name: "System" }, { name: "Profiles" }, { name: "Student PDFs" }, { name: "Chat" },
      { name: "AI Conversations" }, { name: "GPA" }, { name: "Learning Activity" },
      { name: "School News" }, { name: "Study Plans" }, { name: "Course Materials" },
      { name: "Research" }, { name: "User Stats" }, { name: "Edge Functions" },
    ],
  });
}
