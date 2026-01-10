# QuizMaster - Project Overview (Revised)
## EdTech Quiz & Assessment Platform

This revision updates the authentication approach for faster MVP development.

---

## Executive Summary

QuizMaster is a web-based quiz and assessment platform for educational institutions. Teachers create quizzes, students take them, and the system handles auto-grading with immediate feedback.

---

## Core Features (MVP)

### Authentication & Authorization
- **JWT-based authentication** with email/password login
- **Role-based access control** (Student, Teacher, Admin)
- **Password hashing** with bcrypt
- *Note: Azure AD B2C integration available as future enhancement*

### Teacher Features
- Create quizzes with multiple-choice questions
- Set time limits and publish/unpublish quizzes
- View student submissions and scores
- Edit quizzes (before any submissions exist)

### Student Features
- Browse available quizzes
- Take quizzes with countdown timer
- View immediate results with explanations
- Track quiz history and scores

### Admin Features (if time permits)
- View all users
- Change user roles

---

## Technical Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (auth) + React Query (server state)
- **Forms**: React Hook Form + Zod

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT with Passport.js

### Development Environment
- **Database**: PostgreSQL via Docker
- **AI Tools**: VS Code + GitHub Copilot + Claude.ai

---

## Authentication Approach

### Why Simple JWT Instead of Azure AD B2C?

The original plan specified Azure AD B2C, but for this MVP:

| Factor | Azure AD B2C | Simple JWT |
|--------|--------------|------------|
| Setup time | 2-3 hours | 30 minutes |
| External dependencies | Azure account, tenant config | None |
| Debug complexity | High | Low |
| Interview demo | More impressive if works | More reliable |

**Decision**: Use simple JWT auth for MVP. The same auth patterns (guards, decorators, RBAC) apply to both approaches, so the architecture remains production-ready.

**Interview talking point**: "For the demo I used JWT authentication to focus on the core quiz functionality. In production, I would integrate Azure AD B2C for enterprise SSO, which the architecture already supports through the same guard and decorator patterns."

---

## Timeline

### Day 1: Foundation (6-8 hours)
- Project setup (NestJS, Next.js)
- Database schema and migrations
- Authentication (register, login, guards)
- Basic UI layout

### Day 2: Core Features (6-8 hours)
- Quiz CRUD (backend)
- Quiz list and taking interface (frontend)
- Submission and auto-grading
- Results display

### Day 3: Polish (6-8 hours)
- Quiz creation form
- Teacher submission view
- Error handling and loading states
- Responsive design

### Day 4: Testing & Demo Prep (2-4 hours)
- Manual testing
- Bug fixes
- Demo preparation

---

## Success Criteria

By end of development:
- [ ] Teacher can create and publish a quiz
- [ ] Student can take quiz and see immediate results
- [ ] Auto-grading calculates correct score
- [ ] Data persists in PostgreSQL
- [ ] Authentication works (login/logout/protected routes)
- [ ] Basic responsive design
- [ ] Demo-ready with seed data

---

## Out of Scope (MVP)

- Azure AD B2C integration
- Open-ended questions
- File uploads
- Real-time features
- Email notifications
- Analytics charts
- Mobile apps

---

## Demo Accounts

After seeding the database:
- **Teacher**: teacher@demo.com / password123
- **Student**: student@demo.com / password123
- **Admin**: admin@demo.com / password123
