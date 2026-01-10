# QuizMaster - Revised Development Plan
## Practical 3-4 Day Implementation Guide

This revision addresses gaps in the original plan and adapts it for VS Code + Copilot + Claude.ai workflow.

---

## Pre-Development Setup (Do This First)

Before Day 1, get these sorted to avoid blockers:

### Local Environment Checklist

**Required Software:**
```bash
# Check Node.js (need 18+)
node --version

# Check npm
npm --version

# Install NestJS CLI globally
npm install -g @nestjs/cli

# Install PostgreSQL locally OR use Docker
# Option A: Docker (recommended - simpler)
docker run --name quizmaster-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=quizmaster -p 5432:5432 -d postgres:15

# Option B: Install PostgreSQL directly
# macOS: brew install postgresql@15
# Windows: Download from postgresql.org
```

**Verify PostgreSQL is running:**
```bash
# If using Docker
docker ps | grep quizmaster-db

# Test connection (either method)
psql -h localhost -U postgres -d quizmaster -c "SELECT 1"
# Password: postgres
```

### Authentication Decision Point

The original plan uses Azure AD B2C, which adds significant complexity. For interview demo purposes, I recommend:

**Option A: Simple JWT Auth (Recommended for speed)**
- Skip Azure AD B2C entirely
- Implement local JWT auth with email/password
- Saves 2-3 hours on Day 1
- Still demonstrates auth patterns
- Can mention "would integrate Azure AD B2C in production" in interview

**Option B: Azure AD B2C (If you want the full experience)**
- Requires Azure account setup
- 2-3 hours minimum for configuration
- Higher risk of blocking issues
- Better story if it works

This revised plan assumes Option A. If you choose Option B, add the Azure setup from the original plan to Day 1 Phase 1.3.

---

## Day 1: Foundation (6-8 hours)

### Phase 1.1: Backend Setup (1.5 hours)

**Task 1.1.1: Create NestJS Project**

```bash
# Create project
nest new quizmaster-api --package-manager npm
cd quizmaster-api

# Install core dependencies
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @prisma/client class-validator class-transformer
npm install -D prisma @types/passport-jwt @types/bcrypt

# Initialize Prisma
npx prisma init
```

**Task 1.1.2: Configure Environment**

Create `.env` in project root:
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quizmaster"

# JWT
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRATION="7d"

# App
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

**Task 1.1.3: Create Base Module Structure**

Using Copilot, create the module folders. In VS Code, create this structure manually or ask Copilot Chat:

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       └── register.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
├── quizzes/
│   ├── quizzes.module.ts
│   ├── quizzes.controller.ts
│   ├── quizzes.service.ts
│   └── dto/
├── submissions/
│   ├── submissions.module.ts
│   ├── submissions.controller.ts
│   ├── submissions.service.ts
│   └── dto/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── common/
    └── filters/
        └── http-exception.filter.ts
```

**Copilot Chat Prompt for PrismaService:**
```
Create a NestJS PrismaService that:
- Extends PrismaClient
- Implements OnModuleInit to connect on startup
- Implements OnModuleDestroy to disconnect on shutdown
- Is injectable and exported from a PrismaModule
```

---

### Phase 1.2: Database Schema (1 hour)

**Task 1.2.1: Create Prisma Schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // hashed with bcrypt
  name      String
  role      UserRole @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  quizzes     Quiz[]
  submissions Submission[]

  @@index([email])
  @@map("users")
}

model Quiz {
  id          String    @id @default(uuid())
  title       String    @db.VarChar(200)
  description String?   @db.Text
  teacherId   String
  timeLimit   Int       // minutes
  published   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  teacher     User         @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  questions   Question[]
  submissions Submission[]

  @@index([teacherId])
  @@index([published])
  @@map("quizzes")
}

model Question {
  id            String    @id @default(uuid())
  quizId        String
  text          String    @db.Text
  options       Json      // ["Option A", "Option B", "Option C", "Option D"]
  correctOption Int       // 0-3
  explanation   String?   @db.Text
  order         Int
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  quiz    Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers Answer[]

  @@index([quizId])
  @@map("questions")
}

model Submission {
  id             String    @id @default(uuid())
  userId         String
  quizId         String
  score          Int       @default(0)
  totalQuestions Int
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  createdAt      DateTime  @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers Answer[]

  @@index([userId])
  @@index([quizId])
  @@map("submissions")
}

model Answer {
  id             String   @id @default(uuid())
  submissionId   String
  questionId     String
  selectedOption Int
  isCorrect      Boolean
  createdAt      DateTime @default(now())

  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  question   Question   @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, questionId])
  @@index([submissionId])
  @@map("answers")
}
```

**Task 1.2.2: Run Migration**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**Task 1.2.3: Create Seed File**

Create `prisma/seed.ts`:

**Copilot Chat Prompt:**
```
Create a Prisma seed file that:
- Creates 2 teachers and 3 students with bcrypt-hashed passwords (use "password123")
- Creates 2 quizzes with 5 questions each
- Creates sample submissions with answers
- Uses realistic quiz content (JavaScript basics, React fundamentals)
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

Run seed:
```bash
npm install -D ts-node
npx prisma db seed
```

---

### Phase 1.3: Authentication (2 hours)

**Task 1.3.1: Auth Module Implementation**

**Copilot Chat Prompt for auth.service.ts:**
```
Create a NestJS AuthService that:
- Has register(email, password, name, role) method that:
  - Checks if user exists
  - Hashes password with bcrypt
  - Creates user via PrismaService
  - Returns user without password
- Has login(email, password) method that:
  - Finds user by email
  - Compares password with bcrypt
  - Generates JWT token with userId, email, role
  - Returns { accessToken, user }
- Has validateUser(userId) method for JWT strategy
- Inject PrismaService and JwtService
```

**Copilot Chat Prompt for jwt.strategy.ts:**
```
Create a NestJS Passport JWT strategy that:
- Extracts JWT from Authorization Bearer header
- Validates token using JWT_SECRET from config
- Calls authService.validateUser with the userId from payload
- Returns the user object to attach to request
```

**Copilot Chat Prompt for guards and decorators:**
```
Create these NestJS auth components:
1. JwtAuthGuard - extends AuthGuard('jwt')
2. RolesGuard - checks if user.role matches @Roles() decorator
3. @Roles(...roles) decorator - sets metadata for RolesGuard
4. @CurrentUser() decorator - extracts user from request
```

**Task 1.3.2: Auth Controller**

**Copilot Chat Prompt:**
```
Create auth.controller.ts with:
- POST /auth/register - creates new user, returns token
- POST /auth/login - validates credentials, returns token
- GET /auth/me - protected route, returns current user

Use proper DTOs with class-validator decorators.
```

**Test Authentication:**
```bash
# Start the server
npm run start:dev

# Test register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User","role":"STUDENT"}'

# Test login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Test protected route (use token from login response)
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Phase 1.4: Frontend Setup (1.5 hours)

**Task 1.4.1: Create Next.js Project**

```bash
# From parent directory (not inside quizmaster-api)
npx create-next-app@latest quizmaster-ui --typescript --tailwind --app --src-dir --import-alias "@/*"

cd quizmaster-ui

# Install dependencies
npm install @tanstack/react-query axios zustand
npm install react-hook-form zod @hookform/resolvers
npm install lucide-react date-fns js-cookie
npm install -D @types/js-cookie

# Initialize shadcn/ui
npx shadcn@latest init
# Choose: Default style, Slate base color, CSS variables: yes

# Add components
npx shadcn@latest add button card input label
npx shadcn@latest add form select textarea dialog
npx shadcn@latest add alert toast avatar dropdown-menu
npx shadcn@latest add skeleton badge separator
```

**Task 1.4.2: Create Directory Structure**

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── quizzes/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── take/
│   │   │           └── page.tsx
│   │   └── results/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           # shadcn components (auto-generated)
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── quiz/
│       ├── QuizCard.tsx
│       ├── QuestionItem.tsx
│       └── QuizTimer.tsx
├── lib/
│   ├── api.ts        # Axios instance with interceptors
│   ├── auth.ts       # Auth utilities
│   └── utils.ts      # shadcn utility (auto-generated)
├── hooks/
│   └── useAuth.ts
├── store/
│   └── authStore.ts
└── types/
    └── index.ts
```

**Task 1.4.3: Create API Client**

Create `src/lib/api.ts`:

**Copilot Chat Prompt:**
```
Create an Axios API client for Next.js that:
- Has baseURL of process.env.NEXT_PUBLIC_API_URL or http://localhost:3001
- Adds Authorization Bearer token from localStorage on each request
- Has response interceptor that redirects to /login on 401
- Exports typed functions: get<T>, post<T>, put<T>, delete<T>
```

**Task 1.4.4: Create Auth Store**

Create `src/store/authStore.ts`:

**Copilot Chat Prompt:**
```
Create a Zustand auth store with:
- State: user (nullable), token (nullable), isLoading
- Actions: login(email, password), register(data), logout(), loadUser()
- Persist token to localStorage
- On loadUser, fetch /auth/me if token exists
```

**Task 1.4.5: Create Login Page**

Create `src/app/(auth)/login/page.tsx`:

**Copilot Chat Prompt:**
```
Create a Next.js login page that:
- Uses React Hook Form with Zod validation
- Has email and password fields
- Shows loading state during submission
- Displays errors from API
- Redirects to /dashboard on success
- Has link to register page
- Uses shadcn/ui components (Card, Input, Button, Form)
```

**Task 1.4.6: Create Dashboard Layout**

Create `src/app/(dashboard)/layout.tsx`:

**Copilot Chat Prompt:**
```
Create a dashboard layout that:
- Checks if user is authenticated (redirect to /login if not)
- Shows loading skeleton while checking auth
- Renders Header component with user info and logout
- Has a Sidebar with navigation based on user role
- Main content area for children
- Is responsive (sidebar collapses on mobile)
```

---

### Day 1 Checkpoint

By end of Day 1, verify:
- [ ] Backend starts without errors: `npm run start:dev`
- [ ] Can register a new user via curl/Postman
- [ ] Can login and receive JWT token
- [ ] Can access protected /auth/me route with token
- [ ] Frontend starts: `npm run dev`
- [ ] Can navigate to login page
- [ ] Can login and reach dashboard
- [ ] Dashboard shows user name

**If you're behind schedule:** Skip the sidebar styling, use a simple header-only layout. Focus on auth working end-to-end.

---

## Day 2: Core Features (6-8 hours)

### Phase 2.1: Quiz CRUD Backend (2 hours)

**Task 2.1.1: Quiz DTOs**

Create DTOs with validation:

**Copilot Chat Prompt:**
```
Create NestJS DTOs for quiz management:

CreateQuizDto:
- title: string, min 3, max 200
- description: string, optional
- timeLimit: number, min 1, max 180
- published: boolean, optional, default false
- questions: CreateQuestionDto[]

CreateQuestionDto:
- text: string, min 10
- options: string[], exactly 4 items
- correctOption: number, 0-3
- explanation: string, optional
- order: number

UpdateQuizDto - PartialType of CreateQuizDto

Use class-validator decorators.
```

**Task 2.1.2: Quiz Service**

**Copilot Chat Prompt:**
```
Create QuizzesService with:
- findAll(filters: { published?, teacherId?, search?, page?, limit? })
  - Returns paginated quizzes with question count
  - Excludes deleted quizzes (deletedAt is null)
- findOne(id)
  - Returns quiz with questions (ordered)
  - Throws NotFoundException if not found
- create(dto, teacherId)
  - Creates quiz with nested questions
  - Returns created quiz
- update(id, dto, userId)
  - Verifies user owns the quiz
  - Checks no submissions exist
  - Updates quiz
- remove(id, userId)
  - Soft deletes (sets deletedAt)
  - Verifies ownership

Use Prisma transactions where needed.
```

**Task 2.1.3: Quiz Controller**

**Copilot Chat Prompt:**
```
Create QuizzesController with:
- GET /quizzes - list quizzes (filter by query params)
- GET /quizzes/:id - single quiz with questions
- POST /quizzes - create (teachers only)
- PUT /quizzes/:id - update (teachers only, own quizzes)
- DELETE /quizzes/:id - soft delete (teachers only)

Apply JwtAuthGuard to all routes.
Apply RolesGuard with @Roles('TEACHER', 'ADMIN') to create/update/delete.
Use @CurrentUser() to get teacher ID.
```

---

### Phase 2.2: Submission Backend (1.5 hours)

**Task 2.2.1: Submission DTOs**

**Copilot Chat Prompt:**
```
Create submission DTOs:

StartQuizDto:
- quizId: string, uuid

SubmitAnswersDto:
- answers: AnswerDto[]

AnswerDto:
- questionId: string, uuid
- selectedOption: number, 0-3
```

**Task 2.2.2: Submission Service**

**Copilot Chat Prompt:**
```
Create SubmissionsService with:
- start(quizId, userId)
  - Verify quiz exists and is published
  - Check no active submission exists for this user/quiz
  - Create submission with totalQuestions count
  - Return submission with quiz and questions (hide correctOption!)
  
- submit(submissionId, answers, userId)
  - Verify submission belongs to user
  - Verify not already submitted
  - Verify all questions answered
  - Calculate score by comparing to correctOption
  - Create Answer records
  - Update submission with score and submittedAt
  - Return results with correct answers and explanations

- findUserSubmissions(userId, filters)
  - Returns user's submission history with quiz titles

- findOne(id, userId)
  - Returns submission with answers
  - Include correct answers only if submitted

- findQuizSubmissions(quizId, teacherId)
  - Verify teacher owns quiz
  - Return all submissions with user info
```

**Task 2.2.3: Submission Controller**

**Copilot Chat Prompt:**
```
Create SubmissionsController with:
- POST /submissions/start - start a quiz attempt
- POST /submissions/:id/submit - submit answers
- GET /submissions/my-submissions - student's history
- GET /submissions/:id - single submission details
- GET /quizzes/:id/submissions - all submissions for quiz (teachers)

All routes need JwtAuthGuard.
Teacher routes need RolesGuard.
```

---

### Phase 2.3: Frontend Quiz List (1.5 hours)

**Task 2.3.1: Types**

Create `src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimit: number;
  published: boolean;
  teacherId: string;
  teacher?: User;
  questions?: Question[];
  questionCount?: number;
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption?: number; // Only visible after submission
  explanation?: string;
  order: number;
}

export interface Submission {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  submittedAt?: string;
  quiz?: Quiz;
  answers?: Answer[];
}

export interface Answer {
  id: string;
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  question?: Question;
}
```

**Task 2.3.2: Quiz List Page**

Create `src/app/(dashboard)/quizzes/page.tsx`:

**Copilot Chat Prompt:**
```
Create a quiz list page that:
- Fetches quizzes from GET /quizzes?published=true
- Uses React Query for data fetching
- Displays quizzes in a responsive grid of Cards
- Each card shows: title, description (truncated), question count, time limit
- Has "Take Quiz" button for students
- Has "Edit" button for teachers (on their own quizzes)
- Shows loading skeletons while fetching
- Shows empty state if no quizzes
- Teachers see a "Create Quiz" button in header
```

**Task 2.3.3: Quiz Card Component**

Create `src/components/quiz/QuizCard.tsx`:

**Copilot Chat Prompt:**
```
Create a QuizCard component that:
- Receives quiz object as prop
- Displays title, description (max 2 lines), question count, time limit
- Shows teacher name
- Has action button based on context (Take Quiz / Edit / View Results)
- Uses shadcn Card, Badge components
- Has hover effect
```

---

### Phase 2.4: Quiz Taking Interface (2 hours)

**Task 2.4.1: Quiz Taking Page**

Create `src/app/(dashboard)/quizzes/[id]/take/page.tsx`:

**Copilot Chat Prompt:**
```
Create a quiz taking page that:
- Is a client component ('use client')
- On mount: calls POST /submissions/start with quizId
- Stores submission in state
- Displays quiz title and timer
- Shows all questions (or one at a time with navigation)
- Tracks selected answers in state
- Has submit button (disabled until all answered)
- On submit: calls POST /submissions/:id/submit
- Redirects to results page on success
- Handles timer expiry (auto-submit)
```

**Task 2.4.2: Quiz Timer Component**

Create `src/components/quiz/QuizTimer.tsx`:

**Copilot Chat Prompt:**
```
Create a QuizTimer component that:
- Receives timeLimit (minutes) and onExpire callback
- Shows countdown in MM:SS format
- Updates every second
- Changes color to red when < 5 minutes
- Calls onExpire when reaches 0
- Uses useEffect with cleanup
```

**Task 2.4.3: Question Item Component**

Create `src/components/quiz/QuestionItem.tsx`:

**Copilot Chat Prompt:**
```
Create a QuestionItem component that:
- Receives question, selectedOption, onSelect callback
- Displays question number and text
- Shows 4 radio button options
- Highlights selected option
- Calls onSelect(questionId, optionIndex) on selection
- Uses shadcn RadioGroup
```

**Task 2.4.4: Results Page**

Create `src/app/(dashboard)/results/[id]/page.tsx`:

**Copilot Chat Prompt:**
```
Create a results page that:
- Fetches submission from GET /submissions/:id
- Shows score prominently (8/10, 80%)
- Shows time taken
- Lists each question with:
  - Question text
  - User's answer (green if correct, red if wrong)
  - Correct answer
  - Explanation
- Has "Back to Quizzes" button
- Has "Retake Quiz" button (if allowed)
```

---

### Day 2 Checkpoint

By end of Day 2, verify:
- [ ] Can create a quiz as teacher (via Postman/curl for now)
- [ ] Quiz list shows quizzes
- [ ] Can start taking a quiz as student
- [ ] Timer counts down
- [ ] Can select answers
- [ ] Can submit quiz
- [ ] See results with score and correct answers

**If you're behind schedule:** Skip the quiz creation UI for now. Create quizzes via seed data or Postman. Focus on the taking/results flow.

---

## Day 3: Quiz Creation & Polish (6-8 hours)

### Phase 3.1: Quiz Creation UI (3 hours)

**Task 3.1.1: Create Quiz Form**

Create `src/app/(dashboard)/quizzes/create/page.tsx`:

**Copilot Chat Prompt:**
```
Create a multi-step quiz creation form:

Step 1 - Quiz Details:
- Title input (required)
- Description textarea (optional)
- Time limit select (15, 30, 45, 60 minutes)

Step 2 - Add Questions:
- Dynamic array of questions
- Each question has: text, 4 options, correct option selector, explanation
- Add/remove question buttons
- Minimum 1 question required

Step 3 - Review:
- Show summary of quiz
- Publish toggle
- Submit button

Use React Hook Form with useFieldArray for questions.
Use Zod for validation.
Show validation errors inline.
Submit to POST /quizzes.
Redirect to quiz list on success.
```

**Task 3.1.2: Question Form Component**

Create `src/components/quiz/QuestionForm.tsx`:

**Copilot Chat Prompt:**
```
Create a reusable QuestionForm component for the quiz builder:
- Receives index, control (from useForm), remove callback
- Displays question number
- Has text textarea
- Has 4 option inputs
- Has radio buttons to select correct option (0-3)
- Has explanation textarea (optional)
- Has remove button (with confirmation)
- Integrates with react-hook-form via register/control
```

---

### Phase 3.2: Teacher Features (1.5 hours)

**Task 3.2.1: My Quizzes Page**

Create functionality for teachers to see and manage their quizzes:

**Copilot Chat Prompt:**
```
Modify quizzes page to:
- If user is teacher, show "My Quizzes" tab and "All Quizzes" tab
- My Quizzes shows only their quizzes with:
  - Published/Draft badge
  - Edit button
  - Delete button (with confirmation)
  - View Submissions button (shows count)
- Implement delete functionality (calls DELETE /quizzes/:id)
```

**Task 3.2.2: Quiz Submissions List**

Create a page to view all submissions for a quiz:

**Copilot Chat Prompt:**
```
Create src/app/(dashboard)/quizzes/[id]/submissions/page.tsx:
- Teachers only
- Fetch submissions from GET /quizzes/:id/submissions
- Show table with: student name, score, percentage, submitted at
- Click row to see detailed submission
- Show average score at top
```

---

### Phase 3.3: UI Polish (2 hours)

**Task 3.3.1: Loading States**

Add loading skeletons to all pages:

**Copilot Chat Prompt:**
```
Create a LoadingSkeleton component that can render:
- Quiz card skeleton (for grid)
- Question skeleton (for quiz taking)
- Table row skeleton (for submissions list)
- Stats card skeleton

Use shadcn Skeleton component.
```

**Task 3.3.2: Error Handling**

**Copilot Chat Prompt:**
```
Create error handling:
1. ErrorBoundary component that catches React errors
2. API error display component
3. Toast notifications for success/error messages
4. 404 page for not found routes
```

**Task 3.3.3: Responsive Design Check**

Test and fix:
- [ ] Login page on mobile
- [ ] Dashboard sidebar on mobile (should collapse)
- [ ] Quiz cards stack on mobile
- [ ] Quiz taking works on tablet
- [ ] Results page readable on all sizes

---

### Phase 3.4: Student Dashboard (1 hour)

**Task 3.4.1: Dashboard Stats**

Create `src/app/(dashboard)/page.tsx`:

**Copilot Chat Prompt:**
```
Create a dashboard home page that shows:

For Students:
- Welcome message with name
- Stats cards: Quizzes Taken, Average Score, Best Score
- Recent submissions list (last 5)
- "Browse Quizzes" CTA button

For Teachers:
- Welcome message
- Stats cards: Quizzes Created, Total Submissions, Average Score
- Recent quiz performance
- "Create Quiz" CTA button

Fetch stats from appropriate endpoints (may need to add backend endpoints).
```

---

### Day 3 Checkpoint

By end of Day 3, verify:
- [ ] Can create quiz through UI
- [ ] Can add multiple questions
- [ ] Validation works
- [ ] Quiz saves correctly
- [ ] Teachers can see their quizzes
- [ ] Teachers can view submissions
- [ ] Loading states show
- [ ] Errors display properly
- [ ] Works on mobile

**If you're behind schedule:** Polish is lower priority than core features. Make sure quiz creation and results work. Skip analytics/charts.

---

## Day 4: Testing & Demo Prep (2-4 hours)

### Phase 4.1: Manual Testing (1 hour)

Run through these scenarios:

**Teacher Flow:**
1. Register as teacher
2. Create quiz with 5 questions
3. Preview quiz
4. Publish quiz
5. View quiz in list
6. Check submissions (should be empty)

**Student Flow:**
1. Register as student
2. Browse quizzes
3. Start quiz
4. Answer all questions
5. Submit before timer
6. View results
7. Check submission history

**Edge Cases:**
1. Try submitting with unanswered questions
2. Let timer expire
3. Try accessing teacher routes as student
4. Try editing quiz with submissions

### Phase 4.2: Bug Fixes (1 hour)

Fix any issues found during testing. Prioritize:
1. Auth not working
2. Quiz submission failing
3. Scoring incorrect
4. Navigation broken

### Phase 4.3: Demo Preparation (1 hour)

**Create Demo Data:**
```bash
# Reset and seed database with good demo data
npx prisma migrate reset
npx prisma db seed
```

**Demo Accounts:**
- Teacher: teacher@demo.com / password123
- Student: student@demo.com / password123

**Demo Script:**
1. Show login as teacher
2. Create a new quiz (2-3 questions)
3. Publish quiz
4. Open incognito, login as student
5. Take the quiz
6. Show results
7. Switch back to teacher, show submissions

**Backup Plan:**
- Have screenshots ready
- Have Postman collection ready to show API
- Be ready to show code and explain architecture

### Phase 4.4: Interview Talking Points

Prepare to discuss:

1. **Architecture decisions**
   - Why NestJS (modular, TypeScript-first, decorators)
   - Why Next.js (App Router, server components, built-in routing)
   - Why Prisma (type safety, migrations, great DX)

2. **How you used AI tools**
   - Copilot for boilerplate and repetitive code
   - Claude for architecture discussions and debugging
   - When you didn't use AI (understanding the code, making decisions)

3. **Challenges faced**
   - Auth setup complexity
   - State management for quiz taking
   - Timer synchronization

4. **What you'd do differently**
   - Add WebSockets for real-time updates
   - Implement question bank/reuse
   - Add more question types

5. **Future improvements**
   - Azure AD B2C integration
   - Analytics dashboard with charts
   - Mobile app with React Native

---

## Quick Reference

### Backend Commands
```bash
cd quizmaster-api
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
npm run test         # Run tests
npx prisma studio    # Database GUI
```

### Frontend Commands
```bash
cd quizmaster-ui
npm run dev          # Development server
npm run build        # Production build
npm run start        # Run production build
npm run lint         # Check for errors
```

### Useful API Endpoints for Testing
```bash
# Register
POST /auth/register
{"email":"test@test.com","password":"pass123","name":"Test","role":"TEACHER"}

# Login
POST /auth/login
{"email":"test@test.com","password":"pass123"}

# Create Quiz (need token)
POST /quizzes
Authorization: Bearer <token>
{"title":"Test Quiz","timeLimit":30,"questions":[...]}

# Start Quiz
POST /submissions/start
{"quizId":"..."}

# Submit Answers
POST /submissions/:id/submit
{"answers":[{"questionId":"...","selectedOption":0}]}
```

---

## If Things Go Wrong

**Can't connect to database:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres
# or
pg_isready -h localhost

# Restart Docker container
docker restart quizmaster-db
```

**Prisma errors:**
```bash
# Regenerate client
npx prisma generate

# Reset database
npx prisma migrate reset
```

**JWT not working:**
- Check JWT_SECRET is set in .env
- Check token format: `Authorization: Bearer <token>`
- Check token hasn't expired

**CORS errors:**
- Verify FRONTEND_URL in backend .env
- Check backend is enabling CORS for that origin

**Frontend not connecting to backend:**
- Verify NEXT_PUBLIC_API_URL in frontend .env
- Check backend is running on correct port
- Check no firewall blocking
