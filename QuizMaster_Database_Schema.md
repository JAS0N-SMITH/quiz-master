# QuizMaster - Database Schema (Revised)
## PostgreSQL + Prisma

This revision updates the User model to use password authentication instead of Azure AD B2C.

---

## 1. Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
│─────────────────│
│ id (PK)         │
│ email           │
│ password        │ ← hashed with bcrypt
│ name            │
│ role            │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
         │
         │ 1:M (teacher creates quizzes)
         │ 1:M (student submits)
         ▼
┌─────────────────┐  ┌─────────────────┐
│      Quiz       │  │   Submission    │
│─────────────────│  │─────────────────│
│ id (PK)         │  │ id (PK)         │
│ title           │  │ userId (FK)     │
│ description     │  │ quizId (FK)     │
│ teacherId (FK)  │  │ score           │
│ timeLimit       │  │ totalQuestions  │
│ published       │  │ startedAt       │
│ createdAt       │  │ submittedAt     │
│ updatedAt       │  │ createdAt       │
│ deletedAt       │  └─────────────────┘
└─────────────────┘          │
         │                   │ 1:M
         │ 1:M               │
         │                   ▼
         ▼           ┌─────────────────┐
┌─────────────────┐  │     Answer      │
│    Question     │  │─────────────────│
│─────────────────│  │ id (PK)         │
│ id (PK)         │  │ submissionId(FK)│
│ quizId (FK)     │  │ questionId (FK) │
│ text            │  │ selectedOption  │
│ options (JSON)  │  │ isCorrect       │
│ correctOption   │  │ createdAt       │
│ explanation     │  └─────────────────┘
│ order           │
│ createdAt       │
│ updatedAt       │
│ deletedAt       │
└─────────────────┘
```

---

## 2. Prisma Schema Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// User Model
// ============================================
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // bcrypt hashed, never returned in queries
  name      String
  role      UserRole @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  quizzes     Quiz[]       @relation("TeacherQuizzes")
  submissions Submission[]

  @@index([email])
  @@map("users")
}

enum UserRole {
  STUDENT
  TEACHER
  ADMIN
}

// ============================================
// Quiz Model
// ============================================
model Quiz {
  id          String    @id @default(uuid())
  title       String    @db.VarChar(200)
  description String?   @db.Text
  teacherId   String
  timeLimit   Int       // in minutes
  published   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Soft delete

  // Relations
  teacher     User         @relation("TeacherQuizzes", fields: [teacherId], references: [id], onDelete: Cascade)
  questions   Question[]
  submissions Submission[]

  @@index([teacherId])
  @@index([published])
  @@index([createdAt])
  @@map("quizzes")
}

// ============================================
// Question Model
// ============================================
model Question {
  id            String    @id @default(uuid())
  quizId        String
  text          String    @db.Text
  options       Json      // ["Option A", "Option B", "Option C", "Option D"]
  correctOption Int       // 0-3 (index of correct option)
  explanation   String?   @db.Text
  order         Int       // Display order in quiz
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime? // Soft delete

  // Relations
  quiz    Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers Answer[]

  @@index([quizId])
  @@index([order])
  @@map("questions")
}

// ============================================
// Submission Model
// ============================================
model Submission {
  id             String    @id @default(uuid())
  userId         String
  quizId         String
  score          Int       @default(0)
  totalQuestions Int
  startedAt      DateTime  @default(now())
  submittedAt    DateTime?
  createdAt      DateTime  @default(now())

  // Relations
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  quiz    Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  answers Answer[]

  @@index([userId])
  @@index([quizId])
  @@index([submittedAt])
  @@index([createdAt])
  @@map("submissions")
}

// ============================================
// Answer Model
// ============================================
model Answer {
  id             String   @id @default(uuid())
  submissionId   String
  questionId     String
  selectedOption Int      // 0-3 (index of selected option)
  isCorrect      Boolean
  createdAt      DateTime @default(now())

  // Relations
  submission Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  question   Question   @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@unique([submissionId, questionId]) // Prevent duplicate answers
  @@index([submissionId])
  @@index([questionId])
  @@map("answers")
}
```

---

## 3. Table Details

### Users Table
| Column    | Type         | Constraints           | Description                    |
|-----------|--------------|----------------------|--------------------------------|
| id        | UUID         | PRIMARY KEY          | User identifier                |
| email     | VARCHAR(255) | UNIQUE, NOT NULL     | Login email                    |
| password  | VARCHAR(255) | NOT NULL             | bcrypt hashed password         |
| name      | VARCHAR(255) | NOT NULL             | Display name                   |
| role      | ENUM         | NOT NULL, DEFAULT    | STUDENT, TEACHER, or ADMIN     |
| createdAt | TIMESTAMP    | NOT NULL, DEFAULT    | Account creation               |
| updatedAt | TIMESTAMP    | NOT NULL             | Last update                    |

**Important:** The `password` field should never be returned in API responses. Use Prisma's `select` to exclude it:

```typescript
// Always exclude password
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    createdAt: true,
    // password is NOT included
  },
});
```

---

### Quizzes Table
| Column      | Type         | Constraints           | Description                        |
|-------------|--------------|----------------------|------------------------------------|
| id          | UUID         | PRIMARY KEY          | Quiz identifier                    |
| title       | VARCHAR(200) | NOT NULL             | Quiz title                         |
| description | TEXT         | NULLABLE             | Quiz description                   |
| teacherId   | UUID         | FOREIGN KEY          | Creator (references users.id)      |
| timeLimit   | INTEGER      | NOT NULL             | Time limit in minutes              |
| published   | BOOLEAN      | NOT NULL, DEFAULT    | Is quiz available to students?     |
| createdAt   | TIMESTAMP    | NOT NULL, DEFAULT    | Creation timestamp                 |
| updatedAt   | TIMESTAMP    | NOT NULL             | Last update timestamp              |
| deletedAt   | TIMESTAMP    | NULLABLE             | Soft delete timestamp              |

---

### Questions Table
| Column        | Type      | Constraints           | Description                       |
|---------------|-----------|----------------------|-----------------------------------|
| id            | UUID      | PRIMARY KEY          | Question identifier               |
| quizId        | UUID      | FOREIGN KEY          | Parent quiz                       |
| text          | TEXT      | NOT NULL             | Question text                     |
| options       | JSON      | NOT NULL             | Array of 4 answer options         |
| correctOption | INTEGER   | NOT NULL             | Index of correct option (0-3)     |
| explanation   | TEXT      | NULLABLE             | Explanation of correct answer     |
| order         | INTEGER   | NOT NULL             | Display order in quiz             |
| createdAt     | TIMESTAMP | NOT NULL, DEFAULT    | Creation timestamp                |
| updatedAt     | TIMESTAMP | NOT NULL             | Last update timestamp             |
| deletedAt     | TIMESTAMP | NULLABLE             | Soft delete timestamp             |

---

### Submissions Table
| Column         | Type      | Constraints           | Description                         |
|----------------|-----------|----------------------|-------------------------------------|
| id             | UUID      | PRIMARY KEY          | Submission identifier               |
| userId         | UUID      | FOREIGN KEY          | Student                             |
| quizId         | UUID      | FOREIGN KEY          | Quiz taken                          |
| score          | INTEGER   | NOT NULL, DEFAULT 0  | Number of correct answers           |
| totalQuestions | INTEGER   | NOT NULL             | Total questions at submission time  |
| startedAt      | TIMESTAMP | NOT NULL, DEFAULT    | When student started                |
| submittedAt    | TIMESTAMP | NULLABLE             | When submitted (NULL = in progress) |
| createdAt      | TIMESTAMP | NOT NULL, DEFAULT    | Record creation                     |

---

### Answers Table
| Column         | Type      | Constraints           | Description                           |
|----------------|-----------|----------------------|---------------------------------------|
| id             | UUID      | PRIMARY KEY          | Answer identifier                     |
| submissionId   | UUID      | FOREIGN KEY          | Parent submission                     |
| questionId     | UUID      | FOREIGN KEY          | Question answered                     |
| selectedOption | INTEGER   | NOT NULL             | Student's choice (0-3)                |
| isCorrect      | BOOLEAN   | NOT NULL             | Was answer correct?                   |
| createdAt      | TIMESTAMP | NOT NULL, DEFAULT    | Record creation                       |

---

## 4. Indexes

```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Quiz queries
CREATE INDEX idx_quizzes_teacher_id ON quizzes(teacher_id);
CREATE INDEX idx_quizzes_published ON quizzes(published);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at DESC);

-- Question queries
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_questions_order ON questions("order");

-- Submission queries
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_quiz_id ON submissions(quiz_id);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- Answer queries
CREATE INDEX idx_answers_submission_id ON answers(submission_id);
CREATE INDEX idx_answers_question_id ON answers(question_id);
```

---

## 5. Seed Data

```typescript
// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create teachers
  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher@demo.com',
      password: hashedPassword,
      name: 'Dr. Sarah Johnson',
      role: UserRole.TEACHER,
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'teacher2@demo.com',
      password: hashedPassword,
      name: 'Prof. Michael Chen',
      role: UserRole.TEACHER,
    },
  });

  // Create students
  const student1 = await prisma.user.create({
    data: {
      email: 'student@demo.com',
      password: hashedPassword,
      name: 'Alex Thompson',
      role: UserRole.STUDENT,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@demo.com',
      password: hashedPassword,
      name: 'Maria Garcia',
      role: UserRole.STUDENT,
    },
  });

  // Create admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  // Create JavaScript Quiz
  const jsQuiz = await prisma.quiz.create({
    data: {
      title: 'JavaScript Fundamentals',
      description: 'Test your knowledge of JavaScript basics including variables, functions, and data types.',
      teacherId: teacher1.id,
      timeLimit: 30,
      published: true,
      questions: {
        create: [
          {
            text: 'What is the output of typeof null in JavaScript?',
            options: ['null', 'undefined', 'object', 'number'],
            correctOption: 2,
            explanation: 'typeof null returns "object" due to a historical bug in JavaScript that was never fixed for backward compatibility.',
            order: 1,
          },
          {
            text: 'Which method adds an element to the end of an array?',
            options: ['shift()', 'push()', 'pop()', 'unshift()'],
            correctOption: 1,
            explanation: 'push() adds elements to the end of an array and returns the new length.',
            order: 2,
          },
          {
            text: 'What keyword declares a block-scoped variable that can be reassigned?',
            options: ['var', 'const', 'let', 'function'],
            correctOption: 2,
            explanation: 'let declares a block-scoped variable that can be reassigned. const is also block-scoped but cannot be reassigned.',
            order: 3,
          },
          {
            text: 'What does the === operator check?',
            options: ['Value only', 'Type only', 'Value and type', 'Reference'],
            correctOption: 2,
            explanation: 'The strict equality operator (===) checks both value and type without type coercion.',
            order: 4,
          },
          {
            text: 'Which is NOT a primitive data type in JavaScript?',
            options: ['string', 'boolean', 'array', 'symbol'],
            correctOption: 2,
            explanation: 'Arrays are objects in JavaScript, not primitives. Primitives are: string, number, boolean, null, undefined, symbol, and bigint.',
            order: 5,
          },
        ],
      },
    },
  });

  // Create React Quiz
  const reactQuiz = await prisma.quiz.create({
    data: {
      title: 'React Basics',
      description: 'Assess your understanding of React components, hooks, and state management.',
      teacherId: teacher1.id,
      timeLimit: 45,
      published: true,
      questions: {
        create: [
          {
            text: 'What hook is used to manage state in functional components?',
            options: ['useEffect', 'useState', 'useContext', 'useReducer'],
            correctOption: 1,
            explanation: 'useState is the primary hook for adding state to functional components.',
            order: 1,
          },
          {
            text: 'What is the correct way to pass data from parent to child component?',
            options: ['State', 'Props', 'Context', 'Refs'],
            correctOption: 1,
            explanation: 'Props (properties) are used to pass data from parent to child components.',
            order: 2,
          },
          {
            text: 'When does useEffect run by default?',
            options: ['Only on mount', 'Only on unmount', 'After every render', 'Never'],
            correctOption: 2,
            explanation: 'By default, useEffect runs after every render. You can control this with the dependency array.',
            order: 3,
          },
          {
            text: 'What does the key prop help React with?',
            options: ['Styling', 'Event handling', 'List reconciliation', 'Data fetching'],
            correctOption: 2,
            explanation: 'The key prop helps React identify which items in a list have changed, been added, or removed.',
            order: 4,
          },
          {
            text: 'Which is true about React components?',
            options: [
              'They must return multiple elements',
              'They must start with lowercase',
              'They must return a single root element',
              'They cannot accept props'
            ],
            correctOption: 2,
            explanation: 'React components must return a single root element (or use fragments to wrap multiple elements).',
            order: 5,
          },
        ],
      },
    },
  });

  // Create a sample submission
  const questions = await prisma.question.findMany({
    where: { quizId: jsQuiz.id },
    orderBy: { order: 'asc' },
  });

  const submission = await prisma.submission.create({
    data: {
      userId: student1.id,
      quizId: jsQuiz.id,
      score: 4,
      totalQuestions: 5,
      startedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      submittedAt: new Date(),
      answers: {
        create: [
          { questionId: questions[0].id, selectedOption: 2, isCorrect: true },
          { questionId: questions[1].id, selectedOption: 1, isCorrect: true },
          { questionId: questions[2].id, selectedOption: 2, isCorrect: true },
          { questionId: questions[3].id, selectedOption: 2, isCorrect: true },
          { questionId: questions[4].id, selectedOption: 0, isCorrect: false },
        ],
      },
    },
  });

  console.log('Seed data created successfully!');
  console.log('Demo accounts:');
  console.log('  Teacher: teacher@demo.com / password123');
  console.log('  Student: student@demo.com / password123');
  console.log('  Admin:   admin@demo.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
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
npx prisma db seed
```

---

## 6. Common Queries

### Authentication
```typescript
// Find user for login (includes password for comparison)
const user = await prisma.user.findUnique({
  where: { email },
});

// After verification, return user without password
const safeUser = await prisma.user.findUnique({
  where: { id: user.id },
  select: { id: true, email: true, name: true, role: true },
});
```

### Quiz Operations
```typescript
// Get published quizzes with question count
const quizzes = await prisma.quiz.findMany({
  where: { 
    published: true, 
    deletedAt: null 
  },
  include: {
    teacher: { select: { id: true, name: true } },
    _count: { select: { questions: true } },
  },
  orderBy: { createdAt: 'desc' },
});

// Get quiz with questions for taking
const quiz = await prisma.quiz.findUnique({
  where: { id: quizId },
  include: {
    questions: {
      where: { deletedAt: null },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        text: true,
        options: true,
        order: true,
        // NOTE: correctOption NOT included for students
      },
    },
  },
});
```

### Submission Operations
```typescript
// Create submission when starting quiz
const submission = await prisma.submission.create({
  data: {
    userId,
    quizId,
    totalQuestions: quiz.questions.length,
    startedAt: new Date(),
  },
});

// Submit answers and calculate score
const questions = await prisma.question.findMany({
  where: { quizId },
  select: { id: true, correctOption: true },
});

const answersWithCorrectness = answers.map((answer) => {
  const question = questions.find((q) => q.id === answer.questionId);
  return {
    ...answer,
    isCorrect: question?.correctOption === answer.selectedOption,
  };
});

const score = answersWithCorrectness.filter((a) => a.isCorrect).length;

await prisma.submission.update({
  where: { id: submissionId },
  data: {
    score,
    submittedAt: new Date(),
    answers: {
      create: answersWithCorrectness,
    },
  },
});
```

---

## 7. Migration Commands

```bash
# Create and apply migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## Summary

Key changes from original schema:
- Removed `azureId` field from User
- Added `password` field for bcrypt-hashed passwords
- Password should never be returned in API responses
- All other tables remain the same
