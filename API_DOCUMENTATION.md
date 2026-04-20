# API Endpoint Reference

## Auth
- `POST /api/auth/login`: Authenticate and get JWT.
- `POST /api/auth/signup`: Create new student account.

## Stats & Leaderboard
- `GET /api/stats/me`: Get personal XP and study time.
- `GET /api/stats/leaderboard`: Get top 50 students globally.
- `POST /api/stats/pulse`: Heartbeat to increment study minutes and XP.

## Profiles
- `GET /api/profiles`: List all student profiles.
- `GET /api/profiles/me`: Get current user's profile.
- `PUT /api/profiles/me`: Update profile details.

## AI & Research
- `GET /api/ai-conversations`: Fetch AI tutor history.
- `POST /api/ai-conversations`: Save AI message.
- `GET /api/research`: List scholar search history.

## Academic Tools
- `GET /api/gpa`: Fetch GPA records.
- `POST /api/gpa`: Save new calculation.
- `GET /api/study-plans`: List personalized plans.
