import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

// ─── Profiles ───────────────────────────────────────────────
export const ProfileSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  email: z.string().email(),
  email_username: z.string(),
  matric_number: z.string().nullable(),
  phone_number: z.string().nullable(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  student_id: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UpdateProfileSchema = z.object({
  full_name: z.string().optional(),
  phone_number: z.string().optional(),
  avatar_url: z.string().optional(),
  matric_number: z.string().optional(),
});

// ─── Student PDFs ────────────────────────────────────────────
export const StudentPdfSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().nullable(),
  uploaded_at: z.string().datetime(),
});

export const CreateStudentPdfSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number().optional(),
});

// ─── Chat Messages ───────────────────────────────────────────
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string(),
  receiver_id: z.string().nullable(),
  content: z.string(),
  created_at: z.string().datetime(),
});

export const CreateChatMessageSchema = z.object({
  content: z.string().min(1),
  receiver_id: z.string().optional(),
});

// ─── AI Conversations ────────────────────────────────────────
export const AiConversationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  created_at: z.string().datetime(),
});

export const CreateAiConversationSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

// ─── GPA Records ─────────────────────────────────────────────
export const GpaRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  semester: z.string().nullable(),
  courses: z.any(),
  gpa: z.number(),
  total_credits: z.number(),
  gpa_class: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const CreateGpaRecordSchema = z.object({
  semester: z.string().optional(),
  courses: z.any(),
  gpa: z.number(),
  total_credits: z.number(),
  gpa_class: z.string().optional(),
});

export const UpdateGpaRecordSchema = CreateGpaRecordSchema.partial();

// ─── Learning Activity ───────────────────────────────────────
export const LearningActivitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  activity_type: z.string(),
  activity_count: z.number(),
  activity_date: z.string(),
  created_at: z.string().datetime(),
});

export const CreateLearningActivitySchema = z.object({
  activity_type: z.enum(["ai_chat", "pdf_upload", "quiz", "flashcard", "research", "study_plan", "gpa_calc"]),
  activity_count: z.number().default(1),
});

// ─── School News ─────────────────────────────────────────────
export const SchoolNewsSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  category: z.string().nullable(),
  published_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

// ─── Study Plans ─────────────────────────────────────────────
export const StudyPlanSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  subjects: z.any(),
  total_hours: z.number(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateStudyPlanSchema = z.object({
  name: z.string().min(1),
  subjects: z.any(),
  total_hours: z.number().optional(),
});

export const UpdateStudyPlanSchema = CreateStudyPlanSchema.extend({
  is_active: z.boolean().optional(),
}).partial();

// ─── Course Materials ────────────────────────────────────────
export const CourseMaterialSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  pdf_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  parsed_content: z.string().nullable(),
  study_tools: z.any().nullable(),
  is_processed: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateCourseMaterialSchema = z.object({
  pdf_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  parsed_content: z.string().optional(),
  study_tools: z.any().optional(),
});

export const UpdateCourseMaterialSchema = CreateCourseMaterialSchema.extend({
  is_processed: z.boolean().optional(),
}).partial();

// ─── Research History ─────────────────────────────────────────
export const ResearchHistorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  query: z.string(),
  results: z.any().nullable(),
  ai_summary: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const CreateResearchHistorySchema = z.object({
  query: z.string().min(1),
  results: z.any().optional(),
  ai_summary: z.string().optional(),
});

// ─── User Stats ───────────────────────────────────────────────
export const UserStatsSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  total_study_minutes: z.number(),
  total_ai_interactions: z.number(),
  total_pdfs_processed: z.number(),
  total_quizzes_completed: z.number(),
  total_flashcards_reviewed: z.number(),
  current_streak: z.number(),
  longest_streak: z.number(),
  last_activity_date: z.string().nullable(),
  xp_points: z.number(),
  level: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const UpdateUserStatsSchema = UserStatsSchema.omit({
  id: true, user_id: true, created_at: true, updated_at: true,
}).partial();

// ─── Edge Function Schemas (for docs only) ────────────────────
export const AiChatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  pdfContext: z.string().optional(),
  mode: z.enum(["chat", "teach", "test"]).optional(),
  userId: z.string(),
});

export const AiChatResponseSchema = z.object({ text: z.string() });

export const GenerateEmailRequestSchema = z.object({ full_name: z.string() });
export const GenerateEmailResponseSchema = z.object({ email: z.string() });

export const GenerateStudyToolsRequestSchema = z.object({
  pdfContent: z.string(),
  toolType: z.enum(["flashcards", "quiz", "summary"]),
});
export const GenerateStudyToolsResponseSchema = z.object({ result: z.any() });

export const GetStudyTipsRequestSchema = z.object({ userId: z.string() });
export const GetStudyTipsResponseSchema = z.object({ tips: z.array(z.string()) });

export const ParsePdfRequestSchema = z.object({ filePath: z.string() });
export const ParsePdfResponseSchema = z.object({ text: z.string() });

export const ResearchSearchRequestSchema = z.object({ query: z.string() });
export const ResearchSearchResponseSchema = z.object({
  results: z.array(z.any()),
  ai_summary: z.string(),
});

export const UpdateUserStatsRequestSchema = z.object({
  study_minutes: z.number().optional(),
  xp_points: z.number().optional(),
});
export const UpdateUserStatsResponseSchema = z.object({ success: z.boolean() });
