import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ─────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────
export const UuidParam = z.object({ id: z.string().uuid() });

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────
export const ProfileSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    email: z.string().email(),
    email_username: z.string(),
    matric_number: z.string().nullable(),
    phone_number: z.string().nullable(),
    full_name: z.string().nullable(),
    avatar_url: z.string().url().nullable(),
    student_id: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("Profile");

export const UpdateProfileSchema = z
  .object({
    full_name: z.string().min(1).optional(),
    phone_number: z.string().optional(),
    avatar_url: z.string().url().optional(),
    matric_number: z.string().optional(),
  })
  .openapi("UpdateProfile");

// ─────────────────────────────────────────────
// STUDENT PDFs
// ─────────────────────────────────────────────
export const StudentPdfSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    file_name: z.string(),
    file_path: z.string(),
    file_size: z.number().nullable(),
    uploaded_at: z.string().datetime(),
  })
  .openapi("StudentPdf");

export const CreateStudentPdfSchema = z
  .object({
    file_name: z.string().min(1),
    file_path: z.string().min(1),
    file_size: z.number().optional(),
  })
  .openapi("CreateStudentPdf");

// ─────────────────────────────────────────────
// CHAT MESSAGES
// ─────────────────────────────────────────────
export const ChatMessageSchema = z
  .object({
    id: z.string().uuid(),
    sender_id: z.string().uuid(),
    receiver_id: z.string().uuid().nullable(),
    content: z.string(),
    created_at: z.string().datetime(),
  })
  .openapi("ChatMessage");

export const CreateChatMessageSchema = z
  .object({
    content: z.string().min(1).max(10000),
    receiver_id: z.string().uuid().optional(),
  })
  .openapi("CreateChatMessage");

// ─────────────────────────────────────────────
// AI CONVERSATIONS
// ─────────────────────────────────────────────
export const AiConversationSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    created_at: z.string().datetime(),
  })
  .openapi("AiConversation");

export const CreateAiConversationSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })
  .openapi("CreateAiConversation");

// ─────────────────────────────────────────────
// GPA RECORDS
// ─────────────────────────────────────────────
export const CourseEntrySchema = z.object({
  course_code: z.string(),
  course_name: z.string(),
  grade: z.string(),
  units: z.number(),
});

export const GpaRecordSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    semester: z.string().nullable(),
    courses: z.array(CourseEntrySchema),
    gpa: z.number(),
    total_credits: z.number(),
    gpa_class: z.string().nullable(),
    created_at: z.string().datetime(),
  })
  .openapi("GpaRecord");

export const CreateGpaRecordSchema = z
  .object({
    semester: z.string().optional(),
    courses: z.array(CourseEntrySchema).min(1),
    gpa: z.number().min(0).max(5),
    total_credits: z.number().positive(),
    gpa_class: z.string().optional(),
  })
  .openapi("CreateGpaRecord");

export const UpdateGpaRecordSchema = CreateGpaRecordSchema.partial().openapi(
  "UpdateGpaRecord"
);

// ─────────────────────────────────────────────
// LEARNING ACTIVITY
// ─────────────────────────────────────────────
const ActivityType = z.enum([
  "ai_chat",
  "pdf_upload",
  "quiz",
  "flashcard",
  "research",
  "study_plan",
  "gpa_calc",
]);

export const LearningActivitySchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    activity_type: ActivityType,
    activity_count: z.number().int().positive(),
    activity_date: z.string(),
    created_at: z.string().datetime(),
  })
  .openapi("LearningActivity");

export const CreateLearningActivitySchema = z
  .object({
    activity_type: ActivityType,
    activity_count: z.number().int().positive().optional().default(1),
    activity_date: z.string().optional(),
  })
  .openapi("CreateLearningActivity");

// ─────────────────────────────────────────────
// SCHOOL NEWS
// ─────────────────────────────────────────────
export const SchoolNewsSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    category: z.string().nullable(),
    published_at: z.string().datetime(),
    created_at: z.string().datetime(),
  })
  .openapi("SchoolNews");

// ─────────────────────────────────────────────
// STUDY PLANS
// ─────────────────────────────────────────────
export const SubjectEntrySchema = z.object({
  name: z.string(),
  hours_per_week: z.number(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const StudyPlanSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    name: z.string(),
    subjects: z.array(SubjectEntrySchema),
    total_hours: z.number(),
    is_active: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("StudyPlan");

export const CreateStudyPlanSchema = z
  .object({
    name: z.string().min(1),
    subjects: z.array(SubjectEntrySchema).min(1),
    total_hours: z.number().optional(),
    is_active: z.boolean().optional(),
  })
  .openapi("CreateStudyPlan");

export const UpdateStudyPlanSchema = CreateStudyPlanSchema.partial().openapi(
  "UpdateStudyPlan"
);

// ─────────────────────────────────────────────
// COURSE MATERIALS
// ─────────────────────────────────────────────
export const CourseMaterialSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    pdf_id: z.string().uuid().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    parsed_content: z.string().nullable(),
    study_tools: z.record(z.unknown()).nullable(),
    is_processed: z.boolean(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("CourseMaterial");

export const CreateCourseMaterialSchema = z
  .object({
    title: z.string().min(1),
    pdf_id: z.string().uuid().optional(),
    description: z.string().optional(),
    parsed_content: z.string().optional(),
    study_tools: z.record(z.unknown()).optional(),
    is_processed: z.boolean().optional(),
  })
  .openapi("CreateCourseMaterial");

export const UpdateCourseMaterialSchema =
  CreateCourseMaterialSchema.partial().openapi("UpdateCourseMaterial");

// ─────────────────────────────────────────────
// RESEARCH HISTORY
// ─────────────────────────────────────────────
export const ResearchHistorySchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    query: z.string(),
    results: z.array(z.record(z.unknown())).nullable(),
    ai_summary: z.string().nullable(),
    created_at: z.string().datetime(),
  })
  .openapi("ResearchHistory");

export const CreateResearchHistorySchema = z
  .object({
    query: z.string().min(1),
    results: z.array(z.record(z.unknown())).optional(),
    ai_summary: z.string().optional(),
  })
  .openapi("CreateResearchHistory");

// ─────────────────────────────────────────────
// USER STATS
// ─────────────────────────────────────────────
export const UserStatsSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    total_study_minutes: z.number().int(),
    total_ai_interactions: z.number().int(),
    total_pdfs_processed: z.number().int(),
    total_quizzes_completed: z.number().int(),
    total_flashcards_reviewed: z.number().int(),
    current_streak: z.number().int(),
    longest_streak: z.number().int(),
    last_activity_date: z.string().nullable(),
    xp_points: z.number().int(),
    level: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .openapi("UserStats");

export const UpdateUserStatsSchema = z
  .object({
    total_study_minutes: z.number().int().optional(),
    total_ai_interactions: z.number().int().optional(),
    total_pdfs_processed: z.number().int().optional(),
    total_quizzes_completed: z.number().int().optional(),
    total_flashcards_reviewed: z.number().int().optional(),
    current_streak: z.number().int().optional(),
    longest_streak: z.number().int().optional(),
    last_activity_date: z.string().optional(),
    xp_points: z.number().int().optional(),
    level: z.number().int().optional(),
  })
  .openapi("UpdateUserStats");

// ─────────────────────────────────────────────
// EDGE FUNCTION SCHEMAS (documentation only)
// ─────────────────────────────────────────────
export const AiChatRequestSchema = z
  .object({
    message: z.string().min(1),
    pdf_ids: z.array(z.string().uuid()).optional(),
    conversation_history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
      .optional(),
  })
  .openapi("AiChatRequest");

export const AiChatResponseSchema = z
  .object({
    reply: z.string(),
    sources: z.array(z.string()).optional(),
  })
  .openapi("AiChatResponse");

export const GenerateEmailRequestSchema = z
  .object({
    full_name: z.string().min(1),
    matric_number: z.string().min(1),
  })
  .openapi("GenerateEmailRequest");

export const GenerateEmailResponseSchema = z
  .object({
    email: z.string().email(),
    username: z.string(),
  })
  .openapi("GenerateEmailResponse");

export const GenerateStudyToolsRequestSchema = z
  .object({
    pdf_id: z.string().uuid(),
    tool_type: z.enum(["flashcards", "quiz", "summary"]),
  })
  .openapi("GenerateStudyToolsRequest");

export const GenerateStudyToolsResponseSchema = z
  .object({
    tool_type: z.enum(["flashcards", "quiz", "summary"]),
    data: z.record(z.unknown()),
  })
  .openapi("GenerateStudyToolsResponse");

export const GetStudyTipsRequestSchema = z
  .object({
    user_id: z.string().uuid(),
  })
  .openapi("GetStudyTipsRequest");

export const GetStudyTipsResponseSchema = z
  .object({
    tips: z.array(z.string()),
  })
  .openapi("GetStudyTipsResponse");

export const ParsePdfRequestSchema = z
  .object({
    pdf_id: z.string().uuid(),
    file_path: z.string(),
  })
  .openapi("ParsePdfRequest");

export const ParsePdfResponseSchema = z
  .object({
    parsed_content: z.string(),
    page_count: z.number().int(),
  })
  .openapi("ParsePdfResponse");

export const ResearchSearchRequestSchema = z
  .object({
    query: z.string().min(1),
  })
  .openapi("ResearchSearchRequest");

export const ResearchSearchResponseSchema = z
  .object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        snippet: z.string(),
      })
    ),
    ai_summary: z.string(),
  })
  .openapi("ResearchSearchResponse");

export const UpdateUserStatsRequestSchema = z
  .object({
    activity_type: z.enum([
      "ai_chat",
      "pdf_upload",
      "quiz",
      "flashcard",
      "research",
      "study_plan",
      "gpa_calc",
    ]),
    count: z.number().int().positive().optional().default(1),
  })
  .openapi("UpdateUserStatsRequest");

export const UpdateUserStatsResponseSchema = z
  .object({
    updated: z.boolean(),
    new_xp: z.number().int(),
    new_level: z.number().int(),
  })
  .openapi("UpdateUserStatsResponse");
