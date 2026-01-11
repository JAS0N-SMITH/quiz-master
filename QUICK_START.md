# QuizMaster - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (local or Docker)
- npm or yarn package manager

## First Time Setup

Run the setup script to install all dependencies and set up the database:

```bash
npm run setup
```

Or manually:

```bash
# Install all dependencies
npm run install:all

# Set up database (generate Prisma client and run migrations)
npm run db:setup
```

### Environment Configuration

Create a `.env` file in `quizmaster-api/` with the following:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quizmaster"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRATION="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

## Running the Project

### Development Mode (Recommended)

Start both API and UI in development mode with hot reload:

```bash
npm run dev
```

This will start:
- **API**: http://localhost:3001 (NestJS backend)
- **UI**: http://localhost:3000 (Next.js frontend)

### Individual Services

Run services individually:

```bash
# API only
npm run dev:api

# UI only
npm run dev:ui
```

### Production Build

Build both projects:

```bash
npm run build
```

Start production servers:

```bash
npm start
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run setup` | Complete first-time setup (install deps, generate Prisma, migrate DB) |
| `npm run install:all` | Install dependencies for root, API, and UI |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:setup` | Generate Prisma Client and run migrations |
| `npm run dev` | Start both API and UI in development mode |
| `npm run dev:api` | Start only the API in development mode |
| `npm run dev:ui` | Start only the UI in development mode |
| `npm run build` | Build both API and UI for production |
| `npm run build:api` | Build only the API |
| `npm run build:ui` | Build only the UI |
| `npm start` | Start both API and UI in production mode |
| `npm run lint:all` | Lint all projects |

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running:
   ```bash
   # Docker
   docker ps | grep quizmaster-db
   
   # Or check locally
   psql -h localhost -U postgres -d quizmaster -c "SELECT 1"
   ```

2. Verify DATABASE_URL in `quizmaster-api/.env` matches your setup

### Port Already in Use

If ports 3000 or 3001 are already in use:

- **UI**: Change port in `quizmaster-ui/package.json` dev script: `next dev -p 3002`
- **API**: Change PORT in `quizmaster-api/.env`

### Prisma Issues

If you encounter Prisma errors:

```bash
cd quizmaster-api
npx prisma generate
npx prisma migrate reset  # WARNING: This will delete all data
```

## Project Structure

```
quiz-master/
├── quizmaster-api/     # NestJS backend
│   ├── src/           # Source code
│   └── prisma/        # Database schema and migrations
├── quizmaster-ui/     # Next.js frontend
│   └── src/           # Source code
└── scripts/           # Utility scripts
```
