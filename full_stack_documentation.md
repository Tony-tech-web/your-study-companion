# Full Stack API Documentation

## Overview
This project is a high-performance student companion platform built with an Express backend, Prisma ORM, and Supabase Authentication.

## API Base URL
`http://localhost:3000`

## Documentation (Swagger)
The live OpenAPI documentation is available at `/api-docs`.

## Authentication
The system uses **Supabase Auth**. All protected routes require a Bearer token in the `Authorization` header.
- **Login**: `POST /api/auth/login`
- **Signup**: `POST /api/auth/signup`

## Core Modules
1. **User Stats**: Track XP, levels, and study streaks.
2. **AI Tutor**: Save and retrieve conversation history.
3. **Student Profiles**: Global directory of students and their fields of study.
4. **GPA Tracker**: Course-by-course GPA calculation with scholarship multipliers.
5. **Study Planner**: Personalised study plans and schedules.
6. **Research Assistant**: Scholar search history with AI-generated summaries.

## Database Schema
The database is hosted on Supabase (PostgreSQL) and managed via Prisma.
- Run `npx prisma db push` to sync the schema.
- Run `npx prisma studio` to view data.
