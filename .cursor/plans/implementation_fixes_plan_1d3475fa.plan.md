---
name: Implementation Fixes Plan
overview: Implement priority fixes that can be done in development, and add TODO placeholders for production-only fixes that require coordination or breaking changes.
todos:
  - id: env-validation
    content: Add environment validation with Joi in app.module.ts - require JWT_SECRET and FRONTEND_URL in production
    status: completed
  - id: jwt-enhance
    content: Enhance JWT config in auth.module.ts to show dev warning when using default secret
    status: completed
  - id: cors-enhance
    content: Enhance CORS in main.ts to support multiple origins and add origin validation callback
    status: completed
  - id: rate-limiting
    content: Install @nestjs/throttler and add rate limiting to app.module.ts and auth.controller.ts
    status: completed
  - id: security-headers
    content: Install helmet and add security headers to main.ts
    status: completed
  - id: health-check
    content: Create health module and controller with database health check endpoint
    status: completed
  - id: users-me-endpoint
    content: Add PUT /users/me endpoint with update-user.dto.ts, update users.service.ts and users.controller.ts
    status: completed
  - id: quiz-exception-type
    content: Change BadRequestException to ConflictException for quiz edit restriction in quizzes.service.ts
    status: completed
  - id: patch-to-put
    content: Change PATCH to PUT for quiz updates in quizzes.controller.ts
    status: completed
  - id: exception-filter-enhance
    content: Enhance exception filter with logging and production error hiding
    status: completed
  - id: logging-interceptor
    content: Create logging interceptor and add to main.ts
    status: completed
  - id: response-format-todo
    content: Add TODO placeholders for response format standardization (breaking change)
    status: completed
  - id: react-query-todo
    content: Add TODO placeholders for React Query integration in frontend
    status: completed
---

# QuizMaster Implementation Fixes Plan

## Overview

This plan addresses priority fixes from the implementation fixes document. We'll implement dev-ready fixes immediately and add TODO placeholders for production-only changes.

## Current State Analysis

**Already Implemented:**

- JWT secret validation (throws error if missing)
- Exception filter (basic version exists)
- Quiz edit restriction when submissions exist
- Soft delete filtering in queries

**Needs Implementation:**

- Enhanced JWT secret with dev warnings
- Enhanced CORS with multiple origins
- Environment validation with Joi
- Rate limiting
- Security headers (helmet)
- Health check endpoint
- PUT /users/me endpoint
- Change PATCH to PUT for quizzes
- Enhanced exception filter
- Logging interceptor

**Production Placeholders Needed:**

- Response format standardization (breaking change)
- React Query integration (coordinate with frontend)

## Implementation Tasks

### Priority 1: Critical Security Fixes (Dev-Ready)

#### 1.1 Enhance JWT Secret Configuration

**File:** `quizmaster-api/src/auth/auth.module.ts`

- Add dev warning when using default secret
- Keep production error (already implemented)
- Update to show warning in dev mode

#### 1.2 Enhance CORS Configuration

**File:** `quizmaster-api/src/main.ts`

- Add support for multiple origins (comma-separated)
- Add origin validation callback
- Keep production validation (already implemented)
- Add explicit methods and headers

#### 1.3 Add Environment Validation

**File:** `quizmaster-api/src/app.module.ts`

- Install `joi` package
- Add ConfigModule validation schema
- Require JWT_SECRET and FRONTEND_URL in production
- Allow defaults in development

### Priority 2: Security Improvements (Dev-Ready)

#### 2.1 Add Rate Limiting

**Files:**

- `quizmaster-api/src/app.module.ts`
- `quizmaster-api/src/auth/auth.controller.ts`
- Install `@nestjs/throttler`
- Configure rate limits (short, medium, long)
- Apply strict limits to login/register endpoints

#### 2.2 Add Security Headers

**File:** `quizmaster-api/src/main.ts`

- Install `helmet` package
- Configure CSP and security headers
- Set appropriate directives for the app

#### 2.3 Add Health Check Endpoint

**Files to create:**

- `quizmaster-api/src/health/health.module.ts`
- `quizmaster-api/src/health/health.controller.ts`
- Install `@nestjs/terminus`
- Add database health check
- Add simple ready endpoint

### Priority 3: Missing Features (Dev-Ready)

#### 3.1 Add PUT /users/me Endpoint

**Files to create/modify:**

- `quizmaster-api/src/users/dto/update-user.dto.ts` (create)
- `quizmaster-api/src/users/users.service.ts` (add update method)
- `quizmaster-api/src/users/users.controller.ts` (add PUT /me endpoint)
- Add JWT guard to users controller
- Ensure password is never returned

#### 3.2 Quiz Edit Restriction

**Status:** Already implemented in `quizzes.service.ts` (lines 182-186)

- Verify implementation matches spec
- Change BadRequestException to ConflictException per doc

#### 3.3 Soft Delete Filtering

**Status:** Already implemented throughout `quizzes.service.ts`

- Verify all queries properly filter deletedAt

### Priority 4: API Consistency (Dev-Ready)

#### 4.1 Change PATCH to PUT for Quiz Updates

**File:** `quizmaster-api/src/quizzes/quizzes.controller.ts`

- Replace `@Patch(':id')` with `@Put(':id')`
- Update import statement

#### 4.2 Standardize API Response Format

**Status:** Add TODO placeholder for production
**Files:**

- `quizmaster-api/src/common/interceptors/transform.interceptor.ts` (create with TODO)
- `quizmaster-api/src/main.ts` (add TODO comment)
- Add comprehensive TODO explaining breaking change and coordination needed

### Priority 5: Frontend Improvements (Production Placeholders)

#### 5.1 Update API Response Handling

**Status:** Add TODO placeholder
**File:** `quizmaster-ui/src/lib/api.ts` (if exists, or add TODO where it should be created)

- Add TODO for response unwrapping when backend implements transform interceptor

#### 5.2 Add React Query

**Status:** Add TODO placeholder
**Files to create with TODOs:**

- `quizmaster-ui/src/lib/query-client.ts` (create with TODO)
- `quizmaster-ui/src/providers/query-provider.tsx` (create with TODO)
- Add TODOs explaining when to implement

### Priority 6: Code Quality (Dev-Ready)

#### 6.1 Enhance Exception Filter

**File:** `quizmaster-api/src/common/filters/http-exception.filter.ts`

- Add logging for unexpected errors
- Add production mode check to hide internal errors
- Improve error message extraction
- Add timestamp and path (already present, verify format)

#### 6.2 Add Logging Interceptor

**File:** `quizmaster-api/src/common/interceptors/logging.interceptor.ts` (create)

- Log all HTTP requests with method, URL, status, duration
- Include user ID for authenticated requests
- Log errors with context
- Add to `main.ts` as global interceptor

## Implementation Order

1. **Security Foundations** (Priority 1)

- Environment validation
- Enhanced JWT config
- Enhanced CORS

2. **Security Enhancements** (Priority 2)

- Rate limiting
- Security headers
- Health check

3. **Features** (Priority 3)

- PUT /users/me
- Verify quiz restrictions
- Verify soft delete

4. **API Consistency** (Priority 4)

- Change PATCH to PUT
- Add response format TODOs

5. **Code Quality** (Priority 6)

- Enhance exception filter
- Add logging interceptor

6. **Frontend TODOs** (Priority 5)

- Add placeholder files with TODOs

## Notes

- All production-only features will have clear TODO comments explaining:
- Why it's deferred
- What needs to be coordinated
- When to implement
- Breaking changes involved

- Dev-ready fixes will be fully implemented with proper error handling and logging

- Existing implementations will be verified and enhanced where needed