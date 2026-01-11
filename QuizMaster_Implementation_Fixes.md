# QuizMaster Implementation Fixes & Improvements

## Overview

This document contains prioritized fixes and improvements for the QuizMaster application. Tasks are organized by priority level and include specific file paths, code changes, and acceptance criteria.

**Repository Structure:**
- `quizmaster-api/` - NestJS backend
- `quizmaster-ui/` - Next.js frontend

---

## Priority 1: Critical Security Fixes

These issues must be resolved before any production deployment.

### 1.1 Fix JWT Secret Fallback Vulnerability

**File:** `quizmaster-api/src/auth/auth.module.ts`

**Problem:** The JWT module uses a weak default secret ('dev-secret') if JWT_SECRET environment variable is not set. This allows token forgery in production.

**Current Code (approximately line 14):**
```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || 'dev-secret',
  signOptions: { expiresIn: (process.env.JWT_EXPIRATION || '7d') as any },
}),
```

**Required Fix:**
```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

// In the imports array, replace JwtModule.register with:
JwtModule.registerAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret || secret === 'dev-secret') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in production.');
    }
    return {
      secret: secret || 'dev-secret-do-not-use-in-production',
      signOptions: { 
        expiresIn: configService.get<string>('JWT_EXPIRATION', '7d') 
      },
    };
  },
  inject: [ConfigService],
}),
```

**Additional Changes Required:**
1. Ensure `ConfigModule` is imported in `auth.module.ts`
2. Add `ConfigModule.forRoot()` to `app.module.ts` if not already present

**Acceptance Criteria:**
- Application throws error on startup in production if JWT_SECRET is not set
- Application logs warning in development if using default secret
- Existing tests continue to pass

---

### 1.2 Fix CORS Configuration for Production

**File:** `quizmaster-api/src/main.ts`

**Problem:** CORS defaults to localhost if FRONTEND_URL is not set, which could allow unauthorized origins in production.

**Current Code (approximately lines 12-15):**
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

**Required Fix:**
```typescript
// Add validation before enabling CORS
const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl && process.env.NODE_ENV === 'production') {
  throw new Error('FRONTEND_URL environment variable is required in production');
}

const allowedOrigins = frontendUrl 
  ? frontendUrl.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Acceptance Criteria:**
- Application throws error on startup in production if FRONTEND_URL is not set
- Multiple origins can be configured via comma-separated values
- Unauthorized origins are rejected

---

### 1.3 Add Environment Validation at Startup

**File:** `quizmaster-api/src/app.module.ts`

**Problem:** No validation of required environment variables at startup.

**Required Changes:**

1. Install Joi if not present:
```bash
npm install joi
```

2. Update `app.module.ts`:
```typescript
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        JWT_EXPIRATION: Joi.string().default('7d'),
        FRONTEND_URL: Joi.string().when('NODE_ENV', {
          is: 'production',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
      }),
      validationOptions: {
        abortEarly: true,
      },
    }),
    // ... other imports
  ],
})
export class AppModule {}
```

**Acceptance Criteria:**
- Application fails to start with clear error if required env vars are missing
- Development mode works with sensible defaults
- Production mode requires all critical variables

---

## Priority 2: Security Improvements

### 2.1 Add Rate Limiting

**Files to modify:**
- `quizmaster-api/src/app.module.ts`
- `quizmaster-api/src/auth/auth.controller.ts`

**Installation:**
```bash
npm install @nestjs/throttler
```

**Changes to `app.module.ts`:**
```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    // ... other imports
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

**Changes to `auth.controller.ts`:**
```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Strict rate limiting for login attempts
  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // Strict rate limiting for registration
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 3600000 } }) // 3 attempts per hour
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Normal rate limiting for authenticated endpoint
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }
}
```

**Acceptance Criteria:**
- Login endpoint limited to 5 attempts per minute per IP
- Registration endpoint limited to 3 attempts per hour per IP
- Rate limit exceeded returns 429 status code
- Other endpoints have reasonable default limits

---

### 2.2 Add Security Headers

**File:** `quizmaster-api/src/main.ts`

**Installation:**
```bash
npm install helmet
```

**Add to main.ts:**
```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // ... rest of bootstrap
}
```

**Acceptance Criteria:**
- Response headers include security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- CSP header is present and properly configured

---

### 2.3 Add Health Check Endpoint

**Files to create/modify:**
- Create `quizmaster-api/src/health/health.module.ts`
- Create `quizmaster-api/src/health/health.controller.ts`
- Modify `quizmaster-api/src/app.module.ts`

**Installation:**
```bash
npm install @nestjs/terminus
```

**Create `health.controller.ts`:**
```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prisma.$queryRaw`SELECT 1`.then(() => ({
        database: { status: 'up' },
      })).catch(() => ({
        database: { status: 'down' },
      })),
    ]);
  }

  @Get('ready')
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

**Create `health.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

**Add to `app.module.ts` imports:**
```typescript
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // ... other imports
    HealthModule,
  ],
})
```

**Acceptance Criteria:**
- GET /health returns database connectivity status
- GET /health/ready returns simple OK response for load balancer checks

---

## Priority 3: Missing Features

### 3.1 Add PUT /users/me Endpoint

**Files to create/modify:**
- Create `quizmaster-api/src/users/users.module.ts`
- Create `quizmaster-api/src/users/users.controller.ts`
- Create `quizmaster-api/src/users/users.service.ts`
- Create `quizmaster-api/src/users/dto/update-user.dto.ts`

**Create `update-user.dto.ts`:**
```typescript
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}
```

**Create `users.service.ts`:**
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Never include password
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
```

**Create `users.controller.ts`:**
```typescript
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@CurrentUser() user: any) {
    return this.usersService.findOne(user.id);
  }

  @Put('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.id, dto);
  }
}
```

**Create `users.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

**Add to `app.module.ts`:**
```typescript
import { UsersModule } from './users/users.module';
```

**Acceptance Criteria:**
- PUT /users/me updates authenticated user's profile
- Only name field can be updated (email and role are immutable via this endpoint)
- Password is never returned in response

---

### 3.2 Add Quiz Edit Restriction When Submissions Exist

**File:** `quizmaster-api/src/quizzes/quizzes.service.ts`

**Problem:** The spec states quizzes with existing submissions should not be editable, but this check may be missing.

**Required Change in `update` method:**
```typescript
async update(id: string, dto: UpdateQuizDto, userId: string) {
  const quiz = await this.prisma.quiz.findUnique({
    where: { id },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
  });

  if (!quiz) {
    throw new NotFoundException('Quiz not found');
  }

  if (quiz.deletedAt) {
    throw new NotFoundException('Quiz not found');
  }

  if (quiz.teacherId !== userId) {
    throw new ForbiddenException('You can only update your own quizzes');
  }

  // Check for existing submissions
  if (quiz._count.submissions > 0) {
    throw new ConflictException(
      'Cannot modify a quiz that has existing submissions. Create a new quiz instead.'
    );
  }

  // Continue with update...
  return this.prisma.quiz.update({
    where: { id },
    data: {
      title: dto.title,
      description: dto.description,
      timeLimit: dto.timeLimit,
      published: dto.published,
      // Handle questions update if needed
    },
    include: {
      questions: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
      },
    },
  });
}
```

**Also add check in `remove` method:**
```typescript
async remove(id: string, userId: string) {
  const quiz = await this.prisma.quiz.findUnique({
    where: { id },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
  });

  if (!quiz) {
    throw new NotFoundException('Quiz not found');
  }

  if (quiz.teacherId !== userId) {
    throw new ForbiddenException('You can only delete your own quizzes');
  }

  // Optional: Allow soft delete even with submissions, or block
  // Current implementation allows soft delete
  
  return this.prisma.quiz.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
```

**Acceptance Criteria:**
- Attempting to update a quiz with submissions returns 409 Conflict
- Error message clearly explains why the update is blocked
- Soft delete may still be allowed (configurable)

---

### 3.3 Ensure Soft Delete Filtering in All Queries

**File:** `quizmaster-api/src/quizzes/quizzes.service.ts`

**Review all methods to ensure `deletedAt: null` filter is applied:**

```typescript
// In findAll:
async findAll(filters: QueryFilters) {
  const where: any = {
    deletedAt: null, // Always exclude soft-deleted
  };

  if (filters.published !== undefined) {
    where.published = filters.published;
  }

  if (filters.teacherId) {
    where.teacherId = filters.teacherId;
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // ... rest of method
}

// In findOne:
async findOne(id: string) {
  const quiz = await this.prisma.quiz.findUnique({
    where: { id },
    include: {
      teacher: {
        select: { id: true, name: true, email: true },
      },
      questions: {
        where: { deletedAt: null }, // Filter soft-deleted questions
        orderBy: { order: 'asc' },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  if (!quiz || quiz.deletedAt) {
    throw new NotFoundException('Quiz not found');
  }

  return quiz;
}
```

**Acceptance Criteria:**
- Soft-deleted quizzes never appear in list results
- Soft-deleted questions never appear in quiz details
- Direct access to soft-deleted quiz by ID returns 404

---

## Priority 4: API Consistency

### 4.1 Change PATCH to PUT for Quiz Updates

**File:** `quizmaster-api/src/quizzes/quizzes.controller.ts`

**Problem:** API spec defines PUT but implementation uses PATCH.

**Current:**
```typescript
@Patch(':id')
```

**Change to:**
```typescript
@Put(':id')
```

**Full method:**
```typescript
import { Put } from '@nestjs/common';

@Put(':id')
@UseGuards(RolesGuard)
@Roles('TEACHER', 'ADMIN')
update(
  @Param('id') id: string,
  @Body() updateQuizDto: UpdateQuizDto,
  @CurrentUser() user: any,
) {
  return this.quizzesService.update(id, updateQuizDto, user.id);
}
```

**Acceptance Criteria:**
- PUT /quizzes/:id works as documented
- PATCH /quizzes/:id returns 404 (or optionally keep both)

---

### 4.2 Standardize API Response Format

**Files to create/modify:**
- Create `quizmaster-api/src/common/interceptors/transform.interceptor.ts`
- Modify `quizmaster-api/src/main.ts`

**Create `transform.interceptor.ts`:**
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped, return as-is
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        }
        return { data };
      }),
    );
  }
}
```

**Add to `main.ts`:**
```typescript
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add global response transformation
  app.useGlobalInterceptors(new TransformInterceptor());
  
  // ... rest of bootstrap
}
```

**Acceptance Criteria:**
- All successful responses follow format: `{ data: {...}, message?: "..." }`
- Error responses maintain existing format
- Existing clients continue to work (data is now nested under `data` key)

**Note:** This is a breaking change for frontend. Update frontend API calls to access `response.data.data` or update the frontend to handle the new format.

---

## Priority 5: Frontend Improvements

### 5.1 Update Frontend to Handle New Response Format

**File:** `quizmaster-ui/src/lib/api.ts`

**If implementing the response interceptor above, update the API client:**

```typescript
import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor to unwrap data
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Unwrap the data envelope if present
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### 5.2 Add React Query for Server State Management

**Installation:**
```bash
cd quizmaster-ui
npm install @tanstack/react-query
```

**Create `quizmaster-ui/src/lib/query-client.ts`:**
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Create `quizmaster-ui/src/providers/query-provider.tsx`:**
```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Update `quizmaster-ui/src/app/layout.tsx`:**
```typescript
import { QueryProvider } from '@/providers/query-provider';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Create example hook `quizmaster-ui/src/hooks/use-quizzes.ts`:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Quiz } from '@/types';

export function useQuizzes(filters?: { published?: boolean }) {
  return useQuery({
    queryKey: ['quizzes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.published !== undefined) {
        params.set('published', String(filters.published));
      }
      const response = await api.get(`/quizzes?${params}`);
      return response.data as Quiz[];
    },
  });
}

export function useQuiz(id: string) {
  return useQuery({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const response = await api.get(`/quizzes/${id}`);
      return response.data as Quiz;
    },
    enabled: !!id,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateQuizDto) => {
      const response = await api.post('/quizzes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}
```

**Acceptance Criteria:**
- React Query provider is set up globally
- Example hooks demonstrate pattern for data fetching
- Caching and invalidation work correctly

---

## Priority 6: Code Quality & Testing

### 6.1 Add Global Exception Filter

**Create `quizmaster-api/src/common/filters/http-exception.filter.ts`:**
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Error';
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception.message}`,
        exception.stack,
      );
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && status === 500) {
      message = 'An unexpected error occurred';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**Add to `main.ts`:**
```typescript
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // ... rest of bootstrap
}
```

**Acceptance Criteria:**
- All exceptions return consistent error format
- Unexpected errors are logged but not exposed to clients in production
- HTTP exceptions maintain their original status codes and messages

---

### 6.2 Add Basic Logging

**Create `quizmaster-api/src/common/interceptors/logging.interceptor.ts`:**
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.user?.id || 'anonymous';

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const contentLength = response.get('content-length');

          this.logger.log(
            `${method} ${url} ${statusCode} ${contentLength || '-'} - ${Date.now() - now}ms - ${userId} - ${ip} - ${userAgent}`,
          );
        },
        error: (error) => {
          const status = error.status || 500;
          this.logger.error(
            `${method} ${url} ${status} - ${Date.now() - now}ms - ${userId} - ${ip} - ${error.message}`,
          );
        },
      }),
    );
  }
}
```

**Add to `main.ts`:**
```typescript
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // ... rest of bootstrap
}
```

**Acceptance Criteria:**
- All HTTP requests are logged with method, URL, status, duration
- User ID is logged for authenticated requests
- Errors include error message in log

---

## Implementation Checklist

### Priority 1 - Critical (Do First)
- [ ] 1.1 Fix JWT Secret Fallback
- [ ] 1.2 Fix CORS Configuration
- [ ] 1.3 Add Environment Validation

### Priority 2 - Security
- [ ] 2.1 Add Rate Limiting
- [ ] 2.2 Add Security Headers
- [ ] 2.3 Add Health Check Endpoint

### Priority 3 - Missing Features
- [ ] 3.1 Add PUT /users/me Endpoint
- [ ] 3.2 Add Quiz Edit Restriction
- [ ] 3.3 Ensure Soft Delete Filtering

### Priority 4 - API Consistency
- [ ] 4.1 Change PATCH to PUT
- [ ] 4.2 Standardize Response Format

### Priority 5 - Frontend
- [ ] 5.1 Update API Response Handling
- [ ] 5.2 Add React Query

### Priority 6 - Code Quality
- [ ] 6.1 Add Exception Filter
- [ ] 6.2 Add Logging Interceptor

---

## Testing After Implementation

After implementing fixes, verify with these tests:

```bash
# 1. Environment validation - should fail without required vars
NODE_ENV=production npm run start:dev

# 2. Health check
curl http://localhost:3001/health

# 3. Rate limiting - should get 429 after 5 attempts
for i in {1..10}; do curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}'; done

# 4. CORS - should reject unknown origin
curl -H "Origin: http://malicious-site.com" http://localhost:3001/quizzes

# 5. Quiz edit restriction
# Create quiz, submit answer, try to update - should get 409
```

---

## Notes for Cursor

When implementing these fixes:

1. Make changes incrementally - one fix at a time
2. Run `npm run build` after each change to catch TypeScript errors
3. Run existing tests after each change
4. Commit after each successful fix with descriptive message
5. For breaking changes (like response format), update both backend and frontend together
