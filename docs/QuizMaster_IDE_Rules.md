# QuizMaster - IDE Rules (.cursorrules / Copilot context)

This file provides context for AI coding assistants (Cursor, GitHub Copilot) working on the QuizMaster project.

---

## Project Overview

QuizMaster is an EdTech quiz platform with:
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL
- **Auth**: JWT with bcrypt password hashing (email/password login)
- **Database**: PostgreSQL 15 via Docker

**Purpose**: Teachers create quizzes, students take them, system auto-grades.

---

## Development Environment

### Prerequisites
```bash
# Required
node --version    # 18+
npm --version     # 9+
docker --version  # For PostgreSQL

# Global packages
npm install -g @nestjs/cli
```

### Database (Docker)
```bash
# Start PostgreSQL container
docker run --name quizmaster-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=quizmaster \
  -p 5432:5432 \
  -d postgres:15

# Verify running
docker ps | grep quizmaster-db

# Stop/start later
docker stop quizmaster-db
docker start quizmaster-db

# View logs if issues
docker logs quizmaster-db
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quizmaster"
JWT_SECRET="your-secret-key-at-least-32-characters-long"
JWT_EXPIRATION="7d"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## Core Principles

1. **Type Safety**: Use TypeScript strictly, avoid `any`
2. **Server Components by Default**: Use `'use client'` only when needed
3. **API-First**: All data via REST API, no direct DB access from frontend
4. **Role-Based Access**: Enforce at API level with guards
5. **Validation**: DTOs (backend) + Zod (frontend)
6. **Never Return Passwords**: Always exclude from Prisma queries

---

## Technology Stack

### Frontend (quizmaster-ui/)
```
Framework:      Next.js 15+ (App Router)
Language:       TypeScript 5+
Styling:        Tailwind CSS + shadcn/ui
State:          Zustand (auth), React Query (server)
Forms:          React Hook Form + Zod
HTTP:           Axios with interceptors
Icons:          lucide-react
```

### Backend (quizmaster-api/)
```
Framework:      NestJS 10+
Language:       TypeScript 5+
Database:       PostgreSQL 15+ via Prisma
Auth:           JWT (@nestjs/jwt, passport-jwt, bcrypt)
Validation:     class-validator, class-transformer
```

---

## File Structure

### Frontend
```
quizmaster-ui/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Public: login, register
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/         # Protected routes
│   │   │   ├── layout.tsx       # Auth check wrapper
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── quizzes/
│   │   │   │   ├── page.tsx     # List quizzes
│   │   │   │   ├── create/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── take/page.tsx
│   │   │   └── results/[id]/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                  # shadcn components
│   │   ├── quiz/                # QuizCard, QuestionItem, QuizTimer
│   │   └── layout/              # Header, Sidebar
│   ├── lib/
│   │   ├── api.ts               # Axios instance
│   │   └── utils.ts
│   ├── store/
│   │   └── authStore.ts         # Zustand auth state
│   ├── hooks/
│   └── types/
│       └── index.ts
```

### Backend
```
quizmaster-api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts   # /auth/register, /auth/login, /auth/me
│   │   ├── auth.service.ts      # bcrypt, JWT generation
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   ├── users/
│   ├── quizzes/
│   ├── submissions/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   └── common/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
```

---

## Authentication Pattern

### User Model (No Azure ID)
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hashed - NEVER return in API
  name      String
  role      UserRole @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  quizzes     Quiz[]
  submissions Submission[]
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}
```

### Auth Service Pattern
```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check existing
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email exists');

    // Hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: { ...dto, password: hashed },
      select: { id: true, email: true, name: true, role: true }, // NO password
    });

    // Generate token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, accessToken: token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken: token,
    };
  }
}
```

### JWT Strategy Pattern
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
```

### Frontend Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        set({ user: res.data.user, token: res.data.accessToken });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      loadUser: async () => {
        const token = get().token;
        if (!token) {
          set({ isLoading: false });
          return;
        }
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data, isLoading: false });
        } catch {
          set({ user: null, token: null, isLoading: false });
        }
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token }) }
  )
);
```

---

## API Patterns

### Controller with Guards
```typescript
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get()
  findAll(@Query() query: QueryDto) {
    return this.quizzesService.findAll(query);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateQuizDto, @CurrentUser() user: User) {
    return this.quizzesService.create(dto, user.id);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  @UseGuards(RolesGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.quizzesService.remove(id, user.id);
  }
}
```

### DTO Validation
```typescript
export class CreateQuizDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  @Max(180)
  timeLimit: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(10)
  text: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @Min(0)
  @Max(3)
  correctOption: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsNumber()
  @Min(1)
  order: number;
}
```

---

## Prisma Patterns

### Always Exclude Password
```typescript
// GOOD - explicit select without password
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
  },
});

// BAD - includes password
const user = await prisma.user.findUnique({ where: { id } });
```

### Efficient Queries
```typescript
// Get quizzes with counts
const quizzes = await prisma.quiz.findMany({
  where: { published: true, deletedAt: null },
  select: {
    id: true,
    title: true,
    description: true,
    timeLimit: true,
    teacher: { select: { id: true, name: true } },
    _count: { select: { questions: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: (page - 1) * limit,
});

// Get quiz for taking (hide correctOption)
const quiz = await prisma.quiz.findUnique({
  where: { id },
  include: {
    questions: {
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        text: true,
        options: true,
        order: true,
        // NO correctOption, NO explanation
      },
    },
  },
});
```

---

## Frontend Patterns

### Server vs Client Components
```typescript
// Server Component (default) - data fetching
// app/(dashboard)/quizzes/page.tsx
export default async function QuizzesPage() {
  // Can fetch directly, but we use API for consistency
  return <QuizList />;
}

// Client Component - interactivity required
// components/quiz/QuizTimer.tsx
'use client';
import { useState, useEffect } from 'react';

export function QuizTimer({ minutes, onExpire }: Props) {
  const [seconds, setSeconds] = useState(minutes * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          onExpire();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onExpire]);

  return <div>{formatTime(seconds)}</div>;
}
```

### When to Use 'use client'
- useState, useEffect, useContext
- onClick, onChange, onSubmit handlers
- Browser APIs (localStorage, window)
- Third-party hooks (useQuery, useForm, Zustand)

### API Client with Auth
```typescript
// lib/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Security Rules

1. **All API routes** use `@UseGuards(JwtAuthGuard)`
2. **Role-specific routes** add `@Roles()` + `@UseGuards(RolesGuard)`
3. **Check ownership** before update/delete operations
4. **Validate all input** with DTOs and Zod
5. **Never expose passwords** in any response

### Ownership Check Pattern
```typescript
async update(id: string, dto: UpdateQuizDto, userId: string) {
  const quiz = await this.prisma.quiz.findUnique({ where: { id } });

  if (!quiz) throw new NotFoundException('Quiz not found');
  if (quiz.teacherId !== userId) {
    throw new ForbiddenException('Can only update your own quizzes');
  }

  return this.prisma.quiz.update({ where: { id }, data: dto });
}
```

---

## Common AI Prompts

### Create NestJS Module
```
Create a NestJS module for [resource] with:
- Controller with CRUD endpoints (GET list, GET one, POST, PUT, DELETE)
- Service with Prisma integration
- DTOs with class-validator decorators
- JwtAuthGuard on all routes
- RolesGuard on create/update/delete
- Ownership check for update/delete
```

### Create Next.js Page
```
Create a Next.js page for [purpose] that:
- Is a [Server/Client] component
- Fetches data from [endpoint]
- Uses shadcn/ui components
- Shows loading skeleton while fetching
- Handles errors gracefully
- Is responsive with Tailwind
```

### Create Form Component
```
Create a form component for [purpose] that:
- Uses React Hook Form with Zod validation
- Has fields: [list fields]
- Shows inline validation errors
- Has loading state on submit
- Calls [endpoint] on submit
- Uses shadcn/ui form components
```

---

## Quick Commands

```bash
# Database
docker start quizmaster-db      # Start PostgreSQL
docker stop quizmaster-db       # Stop PostgreSQL
docker logs quizmaster-db       # View logs

# Backend
cd quizmaster-api
npm run start:dev               # Dev server with hot reload
npx prisma migrate dev          # Run migrations
npx prisma db seed              # Seed data
npx prisma studio               # Database GUI
npm run test                    # Run tests

# Frontend
cd quizmaster-ui
npm run dev                     # Dev server
npm run build                   # Production build
npm run lint                    # Check errors
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check container running
docker ps | grep quizmaster-db

# Start if stopped
docker start quizmaster-db

# Check connection
psql -h localhost -U postgres -d quizmaster
# Password: postgres
```

### Prisma Issues
```bash
# Regenerate client
npx prisma generate

# Reset database (loses data)
npx prisma migrate reset

# View database
npx prisma studio
```

### JWT Not Working
- Check JWT_SECRET is set in .env
- Check token format: `Authorization: Bearer <token>`
- Check token not expired
- Check user exists in database

### CORS Errors
```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

---

## Demo Accounts (After Seeding)

```
Teacher:  teacher@demo.com  / password123
Student:  student@demo.com  / password123
Admin:    admin@demo.com    / password123
```

---

## Remember

- **MVP first** - Get it working, then improve
- **Use AI heavily** - That's the interview story
- **Test frequently** - Don't let bugs pile up
- **Commit often** - Small, meaningful commits
- **Document decisions** - You'll explain them later
