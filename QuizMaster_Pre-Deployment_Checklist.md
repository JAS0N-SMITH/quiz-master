# QuizMaster Pre-Deployment Checklist

Before deploying to Vercel + Render, verify these items are addressed. Reference `QuizMaster_Implementation_Fixes.md` for detailed implementation guidance.

---

## Critical Items (Must Fix)

### 1. Dynamic Port Configuration

**File:** `quizmaster-api/src/main.ts`

Render sets `PORT` automatically. Your app must read it dynamically.

**Check your bootstrap function looks like this:**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // ... other configuration ...
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
```

**Verify:** The port is NOT hardcoded to 3001.

Status: Completed (uses `process.env.PORT ?? 3000` and logs bound port).
Implementation: See quizmaster-api/src/main.ts.

---

### 2. Add Health Check Endpoint

**Reference:** Implementation Fixes document, Section 2.3

Render pings your service to verify it's running. Add a simple health endpoint.

Status: Completed. Implemented with @nestjs/terminus and Prisma.

Endpoints:
- `GET /health` — DB dependency check via Terminus
- `GET /health/ready` — Readiness including DB check
- `GET /health/live` — Liveness (simple OK, no dependencies)

Test locally:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/live
```

Reference quick implementation (alternate minimal version if needed):

Create `quizmaster-api/src/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { 
        status: 'ok', 
        database: 'connected',
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      return { 
        status: 'error', 
        database: 'disconnected',
        timestamp: new Date().toISOString() 
      };
    }
  }

  @Get('ready')
  ready() {
    return { status: 'ok' };
  }
}
```

Create `quizmaster-api/src/health/health.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

Add to `app.module.ts` imports:
```typescript
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ... other imports
    HealthModule,
  ],
})
```

**Test locally:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","database":"connected","timestamp":"..."}
```

---

### 3. Prisma SSL for Render PostgreSQL

Render's managed PostgreSQL requires SSL connections.

**Option A: Connection String (Recommended)**

When setting `DATABASE_URL` in Render, append SSL mode:
```
postgresql://user:password@host:5432/database?sslmode=require
```

**Option B: Prisma Schema Update**

If you want to handle it in code, update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Uncomment for explicit SSL (usually not needed if URL has sslmode)
  // sslmode  = "require"
}
```

**Note:** Option A is simpler - just add `?sslmode=require` to the connection string Render gives you.

Status: Action Required in Render settings.
Implementation guidance:
- Set Render `DATABASE_URL` to include `?sslmode=require` (code already consumes `DATABASE_URL`).
- Prisma 7 uses prisma.config.ts for datasource; keep SSL in the URL.

---

## Recommended Items (Should Fix)

### 4. JWT Secret Validation

**Reference:** Implementation Fixes document, Section 1.1

Ensure the app won't start in production with a weak/missing JWT secret.

**File:** `quizmaster-api/src/auth/auth.module.ts`

Verify you're using `JwtModule.registerAsync` with validation that throws an error if `JWT_SECRET` is missing in production.

---

### 5. CORS Configuration

**Reference:** Implementation Fixes document, Section 1.2

**File:** `quizmaster-api/src/main.ts`

Ensure CORS is properly configured for your Vercel domain:
```typescript
const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl && process.env.NODE_ENV === 'production') {
  throw new Error('FRONTEND_URL environment variable is required in production');
}

app.enableCors({
  origin: frontendUrl || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

---

### 6. Environment Variables Documentation

Create a `.env.example` file so you remember what's needed:

**Backend (`quizmaster-api/.env.example`):**
```env
# Database - Required
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Authentication - Required in production
JWT_SECRET="generate-with-openssl-rand-base64-32"
JWT_EXPIRATION="7d"

# Server
PORT=3001
NODE_ENV="development"

# CORS - Required in production
FRONTEND_URL="https://your-app.vercel.app"
```

**Frontend (`quizmaster-ui/.env.example`):**
```env
NEXT_PUBLIC_API_URL="https://your-api.onrender.com"
```

---

## Verification Commands

After making changes, run these locally:

```bash
# 1. Build succeeds
cd quizmaster-api && npm run build

# 2. Tests pass
npm test

# 3. Health endpoint works
npm run start:dev &
sleep 5
curl http://localhost:3001/health

# 4. App reads PORT correctly
PORT=5000 npm run start:prod &
sleep 5
curl http://localhost:5000/health
```

---

## Deployment Order

1. Fix critical items above
2. Commit and push to GitHub
3. Deploy database on Render (PostgreSQL)
4. Deploy backend on Render (Web Service)
5. Run migrations via Render shell: `cd quizmaster-api && npx prisma migrate deploy`
6. Deploy frontend on Vercel
7. Update Render's `FRONTEND_URL` with Vercel URL
8. Test full flow

---

## Quick Smoke Test After Deployment

```bash
# Backend health
curl https://your-api.onrender.com/health

# Register a user
curl -X POST https://your-api.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User","role":"TEACHER"}'

# Login
curl -X POST https://your-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

If all three return successful responses, you're good to go.
