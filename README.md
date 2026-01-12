# QuizMaster

An EdTech quiz and assessment platform where teachers create quizzes, students take them, and the system handles auto-grading with immediate feedback.

## What It Does

QuizMaster is a web-based platform designed for educational institutions. Teachers can create multiple-choice quizzes with time limits, publish them for students, and view submission results. Students browse available quizzes, take them with a countdown timer, and receive immediate results with explanations for each question.

## Tech Stack

**Frontend**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS with shadcn/ui components
- Zustand for auth state, React Query for server state
- React Hook Form with Zod validation

**Backend**
- NestJS with TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication with Passport.js
- bcrypt password hashing

**Development**
- PostgreSQL via Docker
- Monorepo structure with shared scripts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (local install or Docker)
- npm or yarn

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/quiz-master.git
cd quiz-master

# Run the setup script (installs dependencies and sets up database)
npm run setup
```

### Environment Configuration

Create `quizmaster-api/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quizmaster"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRATION="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Create `quizmaster-ui/.env.local`:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Running the Application

```bash
# Start both frontend and backend in development mode
npm run dev
```

This launches:
- **API** at http://localhost:3001
- **UI** at http://localhost:3000

To run services individually:

```bash
npm run dev:api    # Backend only
npm run dev:ui     # Frontend only
```

### Demo Accounts

After seeding the database, you can log in with:

| Role    | Email              | Password    |
|---------|-------------------|-------------|
| Teacher | teacher@demo.com  | password123 |
| Student | student@demo.com  | password123 |
| Admin   | admin@demo.com    | password123 |

## Project Structure

```
quiz-master/
├── quizmaster-api/          # NestJS backend
│   ├── src/
│   │   ├── auth/            # Authentication module
│   │   ├── quizzes/         # Quiz CRUD operations
│   │   ├── submissions/     # Quiz attempts and grading
│   │   └── users/           # User management
│   └── prisma/              # Database schema and migrations
├── quizmaster-ui/           # Next.js frontend
│   └── src/
│       ├── app/             # App Router pages
│       ├── components/      # React components
│       └── lib/             # Utilities and API client
└── scripts/                 # Monorepo utility scripts
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | First-time setup (install dependencies, generate Prisma client, run migrations) |
| `npm run dev` | Start both API and UI in development mode |
| `npm run build` | Build both projects for production |
| `npm start` | Start both projects in production mode |
| `npm run lint:all` | Lint all projects |

### Database Commands

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run pending migrations
npm run db:setup       # Generate client and run migrations
```

## API Overview

The backend exposes a RESTful API. All protected routes require a JWT token in the Authorization header.

**Authentication**
- `POST /auth/register` - Create account
- `POST /auth/login` - Get JWT token

**Quizzes**
- `GET /quizzes` - List published quizzes
- `GET /quizzes/:id` - Get quiz details
- `POST /quizzes` - Create quiz (Teacher/Admin)
- `PUT /quizzes/:id` - Update quiz (Owner/Admin)
- `DELETE /quizzes/:id` - Soft delete quiz (Owner/Admin)

**Submissions**
- `POST /submissions/start` - Begin quiz attempt
- `POST /submissions/:id/submit` - Submit answers
- `GET /submissions/my-submissions` - Student's history
- `GET /quizzes/:id/submissions` - Quiz results (Teacher)

**Users**
- `GET /users/me` - Current user profile
- `PUT /users/me` - Update profile

## Architecture Highlights

**Three-Tier Architecture**: Clean separation between presentation (Next.js), application (NestJS), and data (PostgreSQL) layers.

**Role-Based Access Control**: Guards at the API level enforce permissions. Teachers can only edit their own quizzes, students can only view their own submissions.

**Type Safety**: TypeScript throughout, Prisma for type-safe database queries, Zod for runtime validation.

**Security Measures**:
- Passwords hashed with bcrypt (cost factor 10)
- JWT tokens with configurable expiration
- Input validation on all endpoints via class-validator
- SQL injection prevention through Prisma ORM
- Ownership verification in service layer

## Troubleshooting

**Database connection issues**

```bash
# Check if PostgreSQL is running
docker ps | grep quizmaster-db

# Restart the container
docker restart quizmaster-db
```

**Prisma errors**

```bash
cd quizmaster-api
npx prisma generate        # Regenerate client
npx prisma migrate reset   # Reset database (deletes data)
```

**CORS errors**

Verify `FRONTEND_URL` in the backend `.env` file matches your frontend URL.

## Future Enhancements

- Azure AD B2C integration for enterprise SSO
- WebSocket support for real-time quiz updates
- File uploads for quiz images
- Analytics dashboard with charts
- Mobile app with React Native

## License

MIT
