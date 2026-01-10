# Copilot Instructions for QuizMaster

These instructions help AI agents be productive quickly in this repo by codifying the key architecture, workflows, and project conventions sourced from the revised design docs.

## Big Picture
- Platform: Next.js frontend + NestJS API + PostgreSQL via Prisma; auth is JWT + bcrypt.
- Separation: Frontend (presentation), Backend (application), Database (data). Communication over REST + Bearer JWT.
- Why JWT now: Faster MVP; architecture preserves guards/decorators patterns compatible with Azure AD B2C later (see [QuizMaster_-_Architecture_Document_REVISED.md](QuizMaster_-_Architecture_Document_REVISED.md)).

## Code Layout to Create
- Create two sibling apps: `quizmaster-ui/` (Next.js) and `quizmaster-api/` (NestJS). Follow structures shown in:
  - Frontend: components, routes, state store, and axios client in [QuizMaster_-_Architecture_Document_REVISED.md](QuizMaster_-_Architecture_Document_REVISED.md#L49-L122).
  - Backend: modules (auth, users, quizzes, submissions), guards, decorators, and Prisma service in [QuizMaster_-_Architecture_Document_REVISED.md](QuizMaster_-_Architecture_Document_REVISED.md#L141-L220).
- Database schema and seed patterns are in [QuizMaster_-_Database_Schema_REVISED.md](QuizMaster_-_Database_Schema_REVISED.md).

## Critical Conventions
- Frontend
  - Default to Server Components; mark Client Components with `'use client'` only when using hooks/interactivity (examples in [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L243-L333)).
  - Auth state in Zustand; server state via React Query; axios interceptors attach `Authorization: Bearer <token>` and redirect on `401` (see [API client](QuizMaster_-_Architecture_Document_REVISED.md#L334-L373)).
- Backend
  - All protected routes use `JwtAuthGuard`; role-restricted routes add `@Roles(...roles)` + `RolesGuard` (patterns in [Auth](QuizMaster_-_Architecture_Document_REVISED.md#L374-L523)).
  - DTOs with class-validator for all inputs; services enforce ownership and conflict checks (e.g., cannot edit quizzes with submissions).
  - Prisma: always exclude `password` via `select` (see [Database Schema](QuizMaster_-_Database_Schema_REVISED.md#L219-L247)).
- Security/Data
  - Never return `password`.
  - Quiz fetching for taking must NOT include `correctOption` or `explanation` (see [API Spec](QuizMaster_-_API_Specification_REVISED.md#L166-L203)).

## Developer Workflows
- Local DB (Docker): commands and checks in [QuizMaster_-_Revised_Development_Plan.md](QuizMaster_-_Revised_Development_Plan.md#L20-L65).
- Prisma
  - Migrate/dev: `npx prisma migrate dev --name init`
  - Generate client: `npx prisma generate`
  - Seed: `npx prisma db seed` (seed file in `quizmaster-api/prisma/seed.ts`, patterns in [Database Schema](QuizMaster_-_Database_Schema_REVISED.md#L343-L482)).
- Backend (NestJS)
  - Start dev: `npm run start:dev`
  - Env (.env): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `PORT`, `FRONTEND_URL` (values in [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L594-L610)).
- Frontend (Next.js)
  - Start dev: `npm run dev`
  - Env (.env.local): `NEXT_PUBLIC_API_URL` (see [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L611-L617)).

## API Contract Highlights (use these when implementing)
- Auth: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
- Quizzes: `GET /quizzes`, `GET /quizzes/:id`, `POST /quizzes`, `PUT /quizzes/:id`, `DELETE /quizzes/:id`.
- Submissions: `POST /submissions/start`, `POST /submissions/:id/submit`, `GET /submissions/my-submissions`, `GET /submissions/:id`, `GET /quizzes/:id/submissions`.
- Error/status shapes and validation boundaries are defined in [QuizMaster_-_API_Specification_REVISED.md](QuizMaster_-_API_Specification_REVISED.md).

## Implementation Patterns to Mirror
- Auth flow: bcrypt on register/login, JWT containing `sub`, `email`, `role`; strategy validates and attaches `user` (examples in [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L393-L523)).
- Ownership checks: only quiz owner may update/delete; block updates if submissions exist (see controller/service examples in [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L524-L574)).
- Efficient Prisma queries: include `_count` for question counts; filter soft-deleted via `deletedAt: null` (see [Database Schema](QuizMaster_-_Database_Schema_REVISED.md#L525-L620)).

## Scaffolding Notes for AI Agents
- If the code isn’t present yet, scaffold according to the structures in the docs; keep file names and module boundaries consistent with the examples.
- Prefer small, incremental commits per module (Auth → Quizzes → Submissions → UI pages/components).
- Use the curl examples in [API Spec](QuizMaster_-_API_Specification_REVISED.md#L616-L697) to validate endpoints during development.

## Demo Data and Accounts
- After seeding, demo accounts: Teacher `teacher@demo.com`, Student `student@demo.com`, Admin `admin@demo.com` (see [Project Overview](QuizMaster_-_Project_Overview_REVISED.md#L111-L131)).

## Azure Note (future)
- Current MVP uses JWT; when required, swap auth to Azure AD B2C without changing guards/decorators. See upgrade path in [Architecture](QuizMaster_-_Architecture_Document_REVISED.md#L678-L696).

## Extended Reference
- See [QuizMaster_IDE_Rules_REVISED.md](QuizMaster_IDE_Rules_REVISED.md) for full environment setup, detailed patterns, prompts, and troubleshooting.
- See [QuizMaster_-_Revised_Development_Plan.md](QuizMaster_-_Revised_Development_Plan.md) for step-by-step scaffolding, commands, and demo flow.
- Architecture, API, and schema details: [QuizMaster_-_Architecture_Document_REVISED.md](QuizMaster_-_Architecture_Document_REVISED.md), [QuizMaster_-_API_Specification_REVISED.md](QuizMaster_-_API_Specification_REVISED.md), [QuizMaster_-_Database_Schema_REVISED.md](QuizMaster_-_Database_Schema_REVISED.md).
