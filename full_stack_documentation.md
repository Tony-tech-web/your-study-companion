# Full Stack Architecture & Migration Documentation

This document provides a comprehensive overview of the current architecture for the "Your Study Companion" application, alongside detailed instructions on the upcoming architectural migration to a standalone PostgreSQL backend with Zod/OpenAPI documentation.

---

## 1. Current Architecture Overview

The application currently operates as a Serverless Full-Stack Application leveraging Supabase as the entire backend-as-a-service (BaaS).

### Frontend
- **Framework**: React 18 with Vite.
- **Language**: TypeScript.
- **Styling**: Tailwind CSS + `shadcn/ui` components.
- **State/Data Fetching**: `@tanstack/react-query` & standard React Hooks.
- **Routing**: `react-router-dom`.

### Backend & Infrastructure (Supabase)
- **Database**: PostgreSQL hosted on Supabase, utilizing PostgREST to automatically expose database tables as RESTful APIs.
- **Authentication**: Supabase Auth (JWT-based), handling sign-ups, logins, and session management.
- **Storage**: Supabase Storage for storing uploaded PDFs (`student-pdfs` bucket).
- **Edge Functions**: Deno-based serverless functions deployed to Supabase Edge, primarily handling AI integrations and compute-heavy tasks.

---

## 2. Current Database Schema

The current database relies heavily on Supabase Row Level Security (RLS) to ensure users can only access their own data.

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `profiles` | Stores extended user data linked to Auth. | `user_id`, `email`, `matric_number`, `full_name` |
| `student_pdfs` | Metadata for uploaded PDF study materials. | `user_id`, `file_name`, `file_path`, `file_size` |
| `chat_messages` | Real-time student-to-student messaging. | `sender_id`, `content`, `created_at` |
| `ai_conversations` | History of interactions with the AI tutor. | `user_id`, `role`, `content` |
| `school_news` | Public announcements and news. | `title`, `content`, `category` |
| `learning_activity` | Tracks user study sessions and time spent. | `user_id`, `duration_minutes`, `activity_type` |
| `gpa_records` | Stores academic grades for GPA calculation. | `user_id`, `course_code`, `grade`, `units` |
| `study_plans` | User-generated study schedules. | `user_id`, `title`, `schedule_data` |

---

## 3. Current AI Edge Functions

The application utilizes 8 specialized Deno Edge Functions located in `supabase/functions/`. These functions connect to external AI providers (like OpenRouter/Gemini) and perform backend logic that cannot be safely done on the frontend.

1. **`ai-chat`**: Core chat interface, context-aware teaching based on uploaded PDFs, and general web search.
2. **`generate-email`**: Handles intelligent generation of `@elizadeuniversity.edu.ng` email addresses ensuring no collisions.
3. **`generate-study-tools`**: Creates flashcards, quizzes, and summaries from study materials.
4. **`get-leaderboard`**: Aggregates `user_stats` to generate competitive study leaderboards.
5. **`get-study-tips`**: Generates personalized AI study tips based on user habits.
6. **`parse-pdf`**: Extracts text and context from PDF files.
7. **`research-search`**: Uses Serper API (Google Scholar) to fetch academic citations for research queries.
8. **`update-user-stats`**: Safely increments study minutes and updates user metrics.

---

## 4. Target Architecture

Based on recent requirements, the architecture will shift to decouple the database from Supabase's PostgREST API. 

**What stays on Supabase:**
- **Auth**: User authentication and session management.
- **Edge Functions**: AI integrations and specialized compute tasks.
- **Storage**: PDF file hosting.

**What moves off Supabase:**
- **Database**: All relational data will move to a standalone PostgreSQL database.
- **Data Access Layer**: A new Node.js/Express backend will replace direct frontend `supabase.from()` calls.

---

## 5. What to Do Next (Step-by-Step Migration Guide)

To execute this migration and implement the requested **Zod OpenAPI** documentation with the **IOS Dark Liquid Glass** theme, follow these phases:

### Phase 1: Backend Initialization & ORM Setup
1. Create a `/server` directory in the root of the project.
2. Initialize a new Node.js project (`npm init -y`) and install Express, Prisma, TypeScript, and CORS.
3. Initialize Prisma (`npx prisma init`) and configure it to connect to the new standalone PostgreSQL database.
4. Recreate the Supabase database schema inside `schema.prisma`.
5. Run `npx prisma db push` to synchronize the schema to the new database.

### Phase 2: API Route Creation & Auth Middleware
1. Build an Express middleware to validate Supabase JWTs. It will extract the `Authorization: Bearer <TOKEN>` header, verify it against the Supabase project, and attach the `user_id` to the request.
2. Create standard REST endpoints (GET, POST, PUT, DELETE) for all entities (Profiles, PDFs, Chat, AI Conversations, GPA, etc.).
3. Use Prisma inside these endpoints to interact with the database, ensuring that queries strictly filter by the authenticated `user_id` (replicating Supabase RLS).

### Phase 3: Zod & OpenAPI Integration
1. Install `@asteasolutions/zod-to-openapi`, `zod-express-middleware`, and `swagger-ui-express` in the backend.
2. Create a `schemas.ts` file to define strict Zod validation schemas for all incoming request bodies and outgoing responses for the new Express routes.
3. Create schemas for the 8 Supabase Edge Functions (even though they are hosted externally, documenting them here creates a single source of truth).
4. Build the OpenAPI registry using `@asteasolutions/zod-to-openapi` and expose a `/api-docs/swagger.json` endpoint.
5. Setup `swagger-ui-express` at `/api-docs`.

### Phase 4: iOS Dark Liquid Glass Styling
1. Create a `swagger-theme.css` file in the backend.
2. Inject this CSS into `swagger-ui-express` using the `customCss` or `customCssUrl` options.
3. The CSS should target Swagger's `.swagger-ui` classes to apply:
   - Deep dark backgrounds (`#0d0d0d`).
   - Frosted glass panels (`backdrop-filter: blur(16px); background: rgba(255,255,255,0.05)`).
   - Neon accent gradients for HTTP methods.
   - San Francisco / Inter font families.

### Phase 5: Frontend Migration
1. In the React app, perform a global search for `supabase.from(`.
2. Replace every instance with a standard `fetch` or `axios` call pointing to the new Express backend (`http://localhost:3000/api/...`).
3. Ensure the Supabase Auth JWT token is passed in the `Authorization` header of every request.
4. Verify all features (uploading PDFs, generating GPA, tracking study time) function correctly against the new backend.
