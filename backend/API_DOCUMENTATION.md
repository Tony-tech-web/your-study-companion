# Project Architecture & API Documentation

This document provides a complete, verified overview of the system architecture, backend endpoints, and frontend routes to assist in the UI redesign of **Your Study Companion**.

---

## 🏗️ System Overview
- **Frontend:** React + Vite (Tailwind CSS, Shadcn UI, Framer Motion)
- **Backend:** Node.js + Express (Prisma ORM, PostgreSQL)
- **Authentication:** Supabase Auth (JWT verification on backend)
- **Database:** Supabase (PostgreSQL)
- **AI Engine:** Supabase Edge Functions (OpenAI, Gemini, OpenRouter)

---

## 🔑 Authentication & Login Logic
- **Provider:** Supabase Auth.
- **Frontend Check:** `src/contexts/AuthContext.tsx` handles the session. If a session is found in `localStorage`, the user is auto-redirected from `/auth` to `/dashboard`.
- **Backend Protection:** All Express routes (except `/health` and `GET /api/news`) are wrapped in an `authenticate` middleware (`backend/src/middleware/auth.ts`) which verifies the Supabase JWT using the `SUPABASE_JWT_SECRET`.
- **Authorization Header:** All API calls must include `Authorization: Bearer <JWT_TOKEN>`.

---

## 📡 Express API Endpoints (Base: `http://localhost:3000`)

### 🔐 Authentication (Base: `http://localhost:3000`)
- `POST /api/auth/login`: Authenticate with email/username and password. Returns JWT.
- `POST /api/auth/signup`: Register a new student profile (Elizade University email required).

### 👤 Profiles
- `GET /api/profiles/me`: Fetch current user's profile details.
- `PUT /api/profiles/me`: Update profile (full_name, phone_number, avatar_url, matric_number).

### 📄 Student PDFs
- `GET /api/pdfs`: List all PDF metadata uploaded by the user.
- `POST /api/pdfs`: Register a new PDF upload record (metadata).
- `DELETE /api/pdfs/:id`: Delete a PDF record.

### 🤖 AI Conversations (Chat History)
- `GET /api/ai-conversations`: Fetch full history of the AI Tutor chat.
- `POST /api/ai-conversations`: Save a new message (role: 'user' | 'assistant').
- `DELETE /api/ai-conversations`: Clear the entire conversation history.
- `DELETE /api/ai-conversations/:id`: Delete a single message entry.

### 💬 Student Chat (Peer-to-Peer)
- `GET /api/chat`: Fetch messages sent/received by the user.
- `POST /api/chat`: Send a message to another user.

### 📈 User Stats & Leaderboard
- `GET /api/stats/me`: Fetch current user's XP, Level, Study Time, and Streaks.
- `PUT /api/stats/me`: Update/increment study minutes or XP.
- `GET /api/stats/leaderboard`: Fetch top 20 users by XP (Global).

### 🎓 GPA & Learning
- `GET /api/gpa`: List saved GPA calculations.
- `POST /api/gpa`: Save a new GPA record.
- `DELETE /api/gpa/:id`: Delete a GPA record.
- `GET /api/activity`: Fetch activity logs (for heatmaps/stats).
- `POST /api/activity`: Log a new action (e.g., 'quiz_completed').

### 📚 Study Tools & Research
- `GET /api/study-plans`: List all study plans.
- `POST /api/study-plans`: Create a study plan.
- `PUT /api/study-plans/:id`: Update a study plan.
- `DELETE /api/study-plans/:id`: Delete a study plan.
- `GET /api/course-materials`: List processed course materials.
- `GET /api/course-materials/:id`: Fetch a specific course material (with PDF details).
- `POST /api/course-materials`: Save a new course material.
- `PUT /api/course-materials/:id`: Update course material (parsed_content, etc.).
- `DELETE /api/course-materials/:id`: Delete course material.
- `GET /api/research`: List past research entries.
- `POST /api/research`: Save a research search result.
- `DELETE /api/research/:id`: Delete a research entry.

### 📜 Consolidated History
- `GET /api/history`: Fetch unified timeline of AI chats, GPA calculations, Research, and Materials.

### 🏥 System & AI Health
- `GET /api/model-health`: Check status and key configuration for AI providers.
- `GET /health`: Basic server heartbeat.

### 📰 School News
- `GET /api/news`: Fetch public school news (No Auth required).
- `POST /api/news`: Create news article (Admin only).

---

## ⚡ Supabase Edge Functions (AI & Microservices)
Called via `supabase.functions.invoke()` from the frontend:

- `ai-chat`: Core AI Tutor logic (supports streaming).
- `parse-pdf`: OCR and text extraction service.
- `generate-study-tools`: AI-powered generation of quizzes, flashcards, and summaries.
- `research-search`: Academic/Scholar search integration.
- `get-study-tips`: Generates personalised AI learning advice.
- `get-leaderboard`: Alternative leaderboard fetch (Edge side).
- `update-user-stats`: Edge-side stat increments.
- `generate-email`: Utility for generating user emails based on profile.

---

## 🎨 Frontend Application Paths

| Path | Description | Page Component |
|------|-------------|----------------|
| `/` | Landing Page (Public) | `Index.tsx` |
| `/auth` | Login / Sign Up Page | `Auth.tsx` |
| `/dashboard` | Main Stats & Action Grid | `Dashboard.tsx` |
| `/dashboard/ai-assistant` | AI Study Tutor Interface | `AIAssistant.tsx` |
| `/dashboard/profile` | User Settings & Profile | `Profile.tsx` |
| `/dashboard/gpa` | GPA Calculator & History | `GPACalculator.tsx` |
| `/dashboard/planner` | AI Study Planner | `StudyPlanner.tsx` |
| `/dashboard/courses` | PDF Management & Tool Gen | `CourseAssistant.tsx` |
| `/dashboard/research` | Research Assistant | `ResearchAssistant.tsx` |
| `/dashboard/chat` | Student Community Chat | `StudentChat.tsx` |
| `/dashboard/news` | School News Feed | `SchoolNews.tsx` |
| `/dashboard/leaderboard` | Global Rankings | `Leaderboard.tsx` |
| `/dashboard/history` | Interaction History Logs | `History.tsx` |
| `/dashboard/tips` | AI Learning Tips | `Tips.tsx` |

---

## 🛠️ API Documentation (Swagger)
The project uses **zod-openapi** to generate a live Swagger UI.
🔗 **URL:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
🔗 **Spec:** [http://localhost:3000/api-docs/swagger.json](http://localhost:3000/api-docs/swagger.json)
