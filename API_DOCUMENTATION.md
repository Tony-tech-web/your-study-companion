# API Endpoint Reference (Consolidated)

> [!NOTE]
> For a more detailed breakdown including Frontend paths and UI interactions, see the [Frontend API Documentation](file:///c:/Users/Anthony/Documents/WORK/Stark/Stark\Websites\AI\your-study-companion-FRONTEND-\API_DOCUMENTATION.md).

## 📡 Base URL: `http://localhost:3000`

### 🔐 Auth
- `POST /api/auth/login`: Authenticate and get JWT.
- `POST /api/auth/signup`: Create new student account.

### 👤 Profiles
- `GET /api/profiles/me`: Get personal profile.
- `PUT /api/profiles/me`: Update profile details.

### 📈 Stats & Leaderboard
- `GET /api/stats/me`: Get personal XP and study time.
- `GET /api/stats/leaderboard`: Get top 50 students globally.
- `POST /api/stats/pulse`: Heartbeat to increment study minutes and XP.

### 🤖 AI & Research
- `GET /api/ai-conversations`: Fetch AI tutor history.
- `POST /api/ai-conversations`: Save AI message.
- `DELETE /api/ai-conversations`: Clear history.
- `GET /api/research`: List scholar search history.

### 🎓 Academic Tools
- `GET /api/gpa`: Fetch GPA records.
- `POST /api/gpa`: Save new calculation.
- `GET /api/study-plans`: List personalized plans.
- `GET /api/course-materials`: List course materials.

### 📜 History
- `GET /api/history`: Unified timeline of all activities.

---

🔗 **Live Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
