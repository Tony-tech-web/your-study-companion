# Database Setup & Configuration

## Requirements
- Node.js & npm
- Supabase Project (PostgreSQL + Auth)
- Environment variables in `backend/.env`

## Initialization Steps
1. **Configure Environment**: Ensure `DATABASE_URL` and `DIRECT_URL` are set in the `.env` file.
2. **Push Schema**:
   ```bash
   cd backend
   npx prisma db push
   ```
3. **Generate Client**:
   ```bash
   npx prisma generate
   ```

## Key Tables
- `profiles`: Student identity and details.
- `user_stats`: XP, Levels, and Streaks.
- `ai_conversations`: Chat history.
- `gpa_records`: Semester calculations.

## Maintenance
- **Studio**: Run `npx prisma studio` to manage records visually.
- **Cleanup**: Delete the `node_modules` and re-install if Prisma types become stale.
