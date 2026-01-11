# QuizMaster - Testing Plan (Revised)
## Version 1.1 - Aligned with JWT Authentication

This revision updates the testing plan to align with the simplified JWT authentication approach and includes comprehensive manual testing scripts with suggested inputs for demos and initial testing.

---

## 1. Testing Strategy

### Testing Pyramid
```
        /\
       /  \
      / E2E\         Few (5-10 tests)
     /______\
    /        \
   /Integration\     Some (20-30 tests)
  /____________\
 /              \
/   Unit Tests   \   Many (50+ tests)
/________________\
```

### Coverage Goals

| Test Type | Target | Focus Areas |
|-----------|--------|-------------|
| Unit Tests | 70%+ code coverage | Services, utilities, business logic |
| Integration Tests | Critical user flows | API endpoints, database operations |
| E2E Tests | Happy paths | Complete user journeys |
| Manual Tests | Edge cases, UX | Form validation, error handling, demos |

### Testing Priorities (MVP)

1. Authentication flow (register, login, protected routes)
2. Quiz CRUD operations
3. Quiz taking and submission
4. Score calculation and results display
5. Role-based access control

---

## 2. Backend Testing (NestJS)

### 2.1 Unit Tests

#### AuthService Tests
**File**: `src/auth/auth.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'STUDENT',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: dto.email,
        name: dto.name,
        role: dto.role,
      });

      const result = await service.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
    });

    it('should throw ConflictException if email exists', async () => {
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const user = {
        id: 'user-id',
        email: dto.email,
        password: 'hashed-password',
        name: 'Test User',
        role: 'STUDENT',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      const dto = { email: 'wrong@example.com', password: 'password123' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const dto = { email: 'test@example.com', password: 'wrongpassword' };
      const user = {
        id: 'user-id',
        email: dto.email,
        password: 'hashed-password',
        name: 'Test User',
        role: 'STUDENT',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

#### QuizzesService Tests
**File**: `src/quizzes/quizzes.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('QuizzesService', () => {
  let service: QuizzesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        {
          provide: PrismaService,
          useValue: {
            quiz: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a quiz with questions', async () => {
      const createQuizDto = {
        title: 'JavaScript Fundamentals',
        description: 'Test your JS knowledge',
        timeLimit: 30,
        questions: [
          {
            text: 'What is the output of typeof null?',
            options: ['null', 'undefined', 'object', 'number'],
            correctOption: 2,
            explanation: 'typeof null returns "object" due to a historical bug.',
            order: 1,
          },
        ],
      };

      const teacherId = 'teacher-uuid';
      const expectedQuiz = { id: 'quiz-uuid', ...createQuizDto, teacherId };

      jest.spyOn(prisma.quiz, 'create').mockResolvedValue(expectedQuiz as any);

      const result = await service.create(createQuizDto, teacherId);

      expect(result).toEqual(expectedQuiz);
      expect(prisma.quiz.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createQuizDto.title,
          teacherId,
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated quizzes', async () => {
      const quizzes = [
        { id: '1', title: 'Quiz 1', published: true },
        { id: '2', title: 'Quiz 2', published: true },
      ];
      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue(quizzes as any);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual(quizzes);
    });

    it('should filter by published status', async () => {
      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue([]);

      await service.findAll({ published: true });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ published: true }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update quiz if user is owner', async () => {
      const quiz = { id: 'quiz-id', teacherId: 'teacher-id', title: 'Old Title' };
      jest.spyOn(prisma.quiz, 'findUnique').mockResolvedValue(quiz as any);
      jest.spyOn(prisma.quiz, 'update').mockResolvedValue({ ...quiz, title: 'New Title' } as any);

      const result = await service.update('quiz-id', { title: 'New Title' }, 'teacher-id');

      expect(result.title).toBe('New Title');
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const quiz = { id: 'quiz-id', teacherId: 'teacher-id' };
      jest.spyOn(prisma.quiz, 'findUnique').mockResolvedValue(quiz as any);

      await expect(
        service.update('quiz-id', { title: 'New Title' }, 'other-teacher'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findUnique').mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { title: 'New Title' }, 'teacher-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

#### SubmissionsService Tests
**File**: `src/submissions/submissions.service.spec.ts`

```typescript
describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: PrismaService;

  // ... setup similar to above

  describe('submit', () => {
    it('should calculate score correctly', async () => {
      const submission = { id: 'sub-id', userId: 'student-id', quizId: 'quiz-id' };
      const questions = [
        { id: 'q1', correctOption: 0 },
        { id: 'q2', correctOption: 1 },
        { id: 'q3', correctOption: 2 },
        { id: 'q4', correctOption: 3 },
        { id: 'q5', correctOption: 0 },
      ];
      const answers = [
        { questionId: 'q1', selectedOption: 0 }, // Correct
        { questionId: 'q2', selectedOption: 0 }, // Incorrect
        { questionId: 'q3', selectedOption: 2 }, // Correct
        { questionId: 'q4', selectedOption: 3 }, // Correct
        { questionId: 'q5', selectedOption: 1 }, // Incorrect
      ];

      jest.spyOn(prisma.submission, 'findUnique').mockResolvedValue(submission as any);
      jest.spyOn(prisma.question, 'findMany').mockResolvedValue(questions as any);
      jest.spyOn(prisma.submission, 'update').mockResolvedValue({
        ...submission,
        score: 3,
        totalQuestions: 5,
      } as any);

      const result = await service.submit('sub-id', answers, 'student-id');

      expect(result.score).toBe(3);
      expect(result.totalQuestions).toBe(5);
    });

    it('should reject submission if not all questions answered', async () => {
      const submission = { id: 'sub-id', userId: 'student-id' };
      const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
      const answers = [
        { questionId: 'q1', selectedOption: 0 },
        { questionId: 'q2', selectedOption: 1 },
        // Missing q3
      ];

      jest.spyOn(prisma.submission, 'findUnique').mockResolvedValue(submission as any);
      jest.spyOn(prisma.question, 'findMany').mockResolvedValue(questions as any);

      await expect(service.submit('sub-id', answers, 'student-id')).rejects.toThrow();
    });

    it('should reject if submission belongs to different user', async () => {
      const submission = { id: 'sub-id', userId: 'other-student' };

      jest.spyOn(prisma.submission, 'findUnique').mockResolvedValue(submission as any);

      await expect(
        service.submit('sub-id', [], 'student-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
```

**Run Unit Tests:**
```bash
cd quizmaster-api
npm run test                    # Run all tests
npm run test:watch              # Watch mode
npm run test:cov                # With coverage
npm run test auth.service       # Specific file
```

---

### 2.2 Integration Tests (E2E)

#### Auth E2E Tests
**File**: `test/auth.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-test' } },
    });
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-student@example.com',
          password: 'password123',
          name: 'E2E Test Student',
          role: 'STUDENT',
        })
        .expect(201);

      expect(response.body.data.user.email).toBe('e2e-test-student@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password not returned
    });

    it('should reject duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-duplicate@example.com',
          password: 'password123',
          name: 'First User',
        });

      // Duplicate attempt
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-duplicate@example.com',
          password: 'password456',
          name: 'Second User',
        })
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com' }) // Missing password and name
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-login@example.com',
          password: 'password123',
          name: 'Login Test User',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e-test-login@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe('e2e-test-login@example.com');
    });

    it('should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e-test-login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'e2e-test-me@example.com',
          password: 'password123',
          name: 'Me Test User',
        });
      token = response.body.data.accessToken;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.email).toBe('e2e-test-me@example.com');
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

#### Quizzes E2E Tests
**File**: `test/quizzes.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Quizzes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create test users and get tokens
    const teacherResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-teacher@example.com',
        password: 'password123',
        name: 'E2E Teacher',
        role: 'TEACHER',
      });
    teacherToken = teacherResponse.body.data.accessToken;

    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'e2e-student@example.com',
        password: 'password123',
        name: 'E2E Student',
        role: 'STUDENT',
      });
    studentToken = studentResponse.body.data.accessToken;
  });

  describe('GET /quizzes', () => {
    it('should return list of quizzes', async () => {
      const response = await request(app.getHttpServer())
        .get('/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter by published status', async () => {
      const response = await request(app.getHttpServer())
        .get('/quizzes?published=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      response.body.data.forEach((quiz: any) => {
        expect(quiz.published).toBe(true);
      });
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/quizzes')
        .expect(401);
    });
  });

  describe('POST /quizzes', () => {
    const createQuizDto = {
      title: 'E2E Test Quiz',
      description: 'A quiz created during E2E testing',
      timeLimit: 30,
      published: false,
      questions: [
        {
          text: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctOption: 1,
          explanation: 'Basic arithmetic: 2 + 2 = 4',
          order: 1,
        },
        {
          text: 'What color is the sky on a clear day?',
          options: ['Red', 'Green', 'Blue', 'Yellow'],
          correctOption: 2,
          explanation: 'The sky appears blue due to light scattering.',
          order: 2,
        },
      ],
    };

    it('should create quiz as teacher', async () => {
      const response = await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(createQuizDto)
        .expect(201);

      expect(response.body.data.title).toBe(createQuizDto.title);
      expect(response.body.data.id).toBeDefined();
    });

    it('should reject quiz creation by student', async () => {
      await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createQuizDto)
        .expect(403);
    });

    it('should validate quiz data', async () => {
      await request(app.getHttpServer())
        .post('/quizzes')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'AB', // Too short (min 3)
          timeLimit: 200, // Too long (max 180)
          questions: [],
        })
        .expect(400);
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-' } },
    });
    await app.close();
  });
});
```

**Run E2E Tests:**
```bash
cd quizmaster-api
npm run test:e2e                # Run all E2E tests
npm run test:e2e -- --watch     # Watch mode
```

---

## 3. Frontend Testing (Next.js)

### 3.1 Component Tests

#### QuestionItem Component Test
**File**: `src/components/quiz/QuestionItem.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionItem from './QuestionItem';

describe('QuestionItem', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    order: 1,
  };

  it('renders question text and all options', () => {
    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={null}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('calls onSelect when option is clicked', () => {
    const onSelect = jest.fn();

    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Paris'));

    expect(onSelect).toHaveBeenCalledWith('q1', 2);
  });

  it('highlights the selected option', () => {
    render(
      <QuestionItem
        question={mockQuestion}
        questionNumber={1}
        selectedOption={2}
        onSelect={jest.fn()}
      />
    );

    const parisOption = screen.getByText('Paris').closest('label');
    expect(parisOption).toHaveClass('selected');
  });
});
```

#### QuizTimer Component Test
**File**: `src/components/quiz/QuizTimer.test.tsx`

```typescript
import { render, screen, act } from '@testing-library/react';
import QuizTimer from './QuizTimer';

jest.useFakeTimers();

describe('QuizTimer', () => {
  it('displays initial time correctly', () => {
    render(<QuizTimer timeLimit={30} onExpire={jest.fn()} />);

    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('counts down every second', () => {
    render(<QuizTimer timeLimit={30} onExpire={jest.fn()} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByText('29:59')).toBeInTheDocument();
  });

  it('calls onExpire when time reaches zero', () => {
    const onExpire = jest.fn();

    render(<QuizTimer timeLimit={1} onExpire={onExpire} />);

    act(() => {
      jest.advanceTimersByTime(60000); // 1 minute
    });

    expect(onExpire).toHaveBeenCalled();
  });

  it('shows warning style when less than 5 minutes remain', () => {
    render(<QuizTimer timeLimit={4} onExpire={jest.fn()} />);

    const timer = screen.getByTestId('quiz-timer');
    expect(timer).toHaveClass('text-red-600');
  });
});
```

**Run Frontend Tests:**
```bash
cd quizmaster-ui
npm run test                    # Run all tests
npm run test -- --watch         # Watch mode
npm run test -- --coverage      # With coverage
```

---

## 4. Manual Testing Checklist

### 4.1 Authentication Flow

#### Test Case: User Registration (Student)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to `/register` | Registration form displays | |
| 2 | Leave all fields empty, click Submit | Validation errors shown for all required fields | |
| 3 | Enter invalid email format | Email validation error shown | |
| 4 | Enter password less than 8 characters | Password validation error shown | |
| 5 | Enter valid data and submit | Success, redirected to dashboard | |
| 6 | Try registering with same email | Error: "Email already registered" | |

#### Test Case: User Registration (Teacher)

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to `/register` | Registration form displays | |
| 2 | Select "Teacher" role | Role selector updates | |
| 3 | Enter valid data and submit | Success, redirected to dashboard with teacher UI | |

#### Test Case: User Login

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to `/login` | Login form displays | |
| 2 | Enter invalid credentials | Error: "Invalid credentials" | |
| 3 | Enter valid credentials | Success, redirected to dashboard | |
| 4 | Verify JWT token stored | Token in localStorage or auth store | |
| 5 | Refresh page | User stays logged in | |

#### Test Case: Protected Routes

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Access `/dashboard` without login | Redirected to `/login` | |
| 2 | Access `/quizzes/create` as student | Redirected or 403 error | |
| 3 | Access admin routes as non-admin | Redirected or 403 error | |

---

### 4.2 Quiz Management (Teacher)

#### Test Case: Create Quiz

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Login as teacher, go to "Create Quiz" | Quiz creation form displays | |
| 2 | Leave title empty, click Next | Validation error for title | |
| 3 | Enter title less than 3 characters | Validation error | |
| 4 | Enter title more than 200 characters | Validation error or truncation | |
| 5 | Enter valid quiz details, proceed | Moves to questions step | |
| 6 | Try to submit with 0 questions | Validation error | |
| 7 | Add question with less than 4 options | Validation error | |
| 8 | Add valid questions and submit | Quiz created, redirect to quiz list | |

#### Test Case: Edit Quiz

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | View own quiz, click Edit | Edit form loads with existing data | |
| 2 | Change title and save | Changes saved successfully | |
| 3 | Try to edit quiz with submissions | Warning or prevention | |

#### Test Case: Delete Quiz

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Click delete on own quiz | Confirmation dialog appears | |
| 2 | Cancel deletion | Quiz remains | |
| 3 | Confirm deletion | Quiz soft-deleted, removed from list | |

---

### 4.3 Quiz Taking (Student)

#### Test Case: Browse and Start Quiz

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Login as student | Dashboard shows available quizzes | |
| 2 | View quiz list | Only published quizzes shown | |
| 3 | Click "Take Quiz" | Quiz interface loads with timer | |
| 4 | Verify timer starts | Timer counting down from time limit | |

#### Test Case: Answer Questions

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Select answer for question 1 | Answer highlighted, saved in state | |
| 2 | Navigate to next question | Can see and answer next question | |
| 3 | Navigate back to question 1 | Previous answer still selected | |
| 4 | Change answer | New answer saved | |

#### Test Case: Submit Quiz

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Try to submit with unanswered questions | Warning or prevention | |
| 2 | Answer all questions, click Submit | Confirmation dialog | |
| 3 | Confirm submission | Submission processed | |
| 4 | View results page | Score and feedback displayed | |

#### Test Case: Timer Expiry

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Start quiz with short timer (or wait) | Timer counts down | |
| 2 | At 5 minutes remaining | Visual warning (red timer) | |
| 3 | At 0 seconds | Auto-submit triggered | |
| 4 | After auto-submit | Redirected to results | |

---

### 4.4 Results and History

#### Test Case: View Results

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | After submission, view results | Score displayed (e.g., "4/5 - 80%") | |
| 2 | Review each question | Correct answer shown in green | |
| 3 | Review incorrect answers | Wrong answers shown in red with explanation | |
| 4 | Click "Back to Quizzes" | Returns to quiz list | |

#### Test Case: Submission History

| Step | Action | Expected Result | Status |
|------|--------|-----------------|--------|
| 1 | Navigate to "My Submissions" | List of past submissions | |
| 2 | Click on a submission | Full results displayed | |

---

## 5. Manual Testing Script with Sample Data

This section provides specific test inputs for demo purposes and initial testing.

### 5.1 Demo Accounts (After Seeding)

These accounts are created by the database seed script:

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Teacher | teacher@demo.com | password123 | Quiz creation, management |
| Student | student@demo.com | password123 | Quiz taking, viewing results |
| Admin | admin@demo.com | password123 | User management |

### 5.2 Registration Test Data

#### Scenario: New Student Registration

```
Email:     jane.student@test.com
Password:  TestPass123!
Name:      Jane Student
Role:      STUDENT
```

#### Scenario: New Teacher Registration

```
Email:     john.teacher@test.com
Password:  TeachPass123!
Name:      John Teacher
Role:      TEACHER
```

#### Scenario: Invalid Registration Attempts

```
Test 1 - Invalid Email:
  Email:     not-an-email
  Password:  password123
  Name:      Test User
  Expected:  Validation error for email format

Test 2 - Short Password:
  Email:     test@example.com
  Password:  short
  Name:      Test User
  Expected:  Validation error for password length

Test 3 - Missing Name:
  Email:     test@example.com
  Password:  password123
  Name:      (empty)
  Expected:  Validation error for required name

Test 4 - Duplicate Email:
  Email:     teacher@demo.com  (already exists)
  Password:  password123
  Name:      Duplicate User
  Expected:  Error: "Email already registered"
```

### 5.3 Login Test Data

#### Valid Logins

```
Test 1 - Teacher Login:
  Email:     teacher@demo.com
  Password:  password123
  Expected:  Success, redirect to dashboard with teacher UI

Test 2 - Student Login:
  Email:     student@demo.com
  Password:  password123
  Expected:  Success, redirect to dashboard with student UI
```

#### Invalid Logins

```
Test 1 - Wrong Password:
  Email:     teacher@demo.com
  Password:  wrongpassword
  Expected:  Error: "Invalid credentials"

Test 2 - Non-existent User:
  Email:     nobody@example.com
  Password:  password123
  Expected:  Error: "Invalid credentials"

Test 3 - Empty Fields:
  Email:     (empty)
  Password:  (empty)
  Expected:  Validation errors for required fields
```

### 5.4 Quiz Creation Test Data

#### Valid Quiz: JavaScript Basics

```json
{
  "title": "JavaScript Fundamentals",
  "description": "Test your knowledge of JavaScript basics including variables, functions, and data types.",
  "timeLimit": 30,
  "published": false,
  "questions": [
    {
      "text": "What is the output of typeof null in JavaScript?",
      "options": ["null", "undefined", "object", "number"],
      "correctOption": 2,
      "explanation": "typeof null returns 'object' due to a historical bug in JavaScript.",
      "order": 1
    },
    {
      "text": "Which method adds an element to the end of an array?",
      "options": ["shift()", "push()", "pop()", "unshift()"],
      "correctOption": 1,
      "explanation": "push() adds elements to the end. shift() removes from beginning, pop() removes from end, unshift() adds to beginning.",
      "order": 2
    },
    {
      "text": "What keyword declares a block-scoped variable that can be reassigned?",
      "options": ["var", "const", "let", "function"],
      "correctOption": 2,
      "explanation": "let is block-scoped and can be reassigned. const is block-scoped but cannot be reassigned. var is function-scoped.",
      "order": 3
    },
    {
      "text": "What does the === operator check?",
      "options": ["Value only", "Type only", "Value and type", "Reference only"],
      "correctOption": 2,
      "explanation": "=== (strict equality) checks both value and type without coercion. == checks value with type coercion.",
      "order": 4
    },
    {
      "text": "Which is NOT a primitive data type in JavaScript?",
      "options": ["string", "boolean", "array", "symbol"],
      "correctOption": 2,
      "explanation": "Arrays are objects in JavaScript. Primitives are: string, number, boolean, null, undefined, symbol, bigint.",
      "order": 5
    }
  ]
}
```

#### Valid Quiz: React Basics

```json
{
  "title": "React Fundamentals",
  "description": "Assess your understanding of React components, hooks, and state management.",
  "timeLimit": 45,
  "published": true,
  "questions": [
    {
      "text": "What hook is used to manage state in functional components?",
      "options": ["useEffect", "useState", "useContext", "useRef"],
      "correctOption": 1,
      "explanation": "useState is the primary hook for adding state to functional components.",
      "order": 1
    },
    {
      "text": "What is the correct way to pass data from parent to child component?",
      "options": ["State", "Props", "Context", "Redux"],
      "correctOption": 1,
      "explanation": "Props are used to pass data from parent to child. Context is for avoiding prop drilling. State is internal to a component.",
      "order": 2
    },
    {
      "text": "When does useEffect run by default?",
      "options": ["Only on mount", "Only on unmount", "After every render", "Before every render"],
      "correctOption": 2,
      "explanation": "By default, useEffect runs after every render. Use dependency array to control when it runs.",
      "order": 3
    },
    {
      "text": "What does the key prop help React with?",
      "options": ["Styling elements", "Event handling", "List reconciliation", "API calls"],
      "correctOption": 2,
      "explanation": "Keys help React identify which items in a list have changed, been added, or removed for efficient updates.",
      "order": 4
    },
    {
      "text": "Which is true about React components?",
      "options": [
        "Must return multiple elements",
        "Must start with lowercase",
        "Must return a single root element",
        "Cannot accept props"
      ],
      "correctOption": 2,
      "explanation": "Components must return a single root element. Use fragments (<></>) to wrap multiple elements without extra DOM nodes.",
      "order": 5
    }
  ]
}
```

#### Invalid Quiz Data (For Validation Testing)

```
Test 1 - Title Too Short:
  Title:      "JS"  (min is 3)
  Expected:   Validation error

Test 2 - Title Too Long:
  Title:      (201+ characters)
  Expected:   Validation error

Test 3 - Time Limit Out of Range:
  TimeLimit:  200  (max is 180)
  Expected:   Validation error

Test 4 - Empty Questions Array:
  Questions:  []
  Expected:   Validation error - at least 1 question required

Test 5 - Question Missing Options:
  Question Text:  "What is 2+2?"
  Options:        ["4", "5"]  (need exactly 4)
  Expected:       Validation error

Test 6 - Invalid Correct Option:
  CorrectOption:  5  (must be 0-3)
  Expected:       Validation error
```

### 5.5 Quiz Submission Test Data

#### Complete Submission (All Correct)

For the JavaScript Fundamentals quiz:

```json
{
  "answers": [
    { "questionId": "<q1-id>", "selectedOption": 2 },
    { "questionId": "<q2-id>", "selectedOption": 1 },
    { "questionId": "<q3-id>", "selectedOption": 2 },
    { "questionId": "<q4-id>", "selectedOption": 2 },
    { "questionId": "<q5-id>", "selectedOption": 2 }
  ]
}

Expected Result: 5/5 (100%)
```

#### Partial Submission (3/5 Correct)

```json
{
  "answers": [
    { "questionId": "<q1-id>", "selectedOption": 2 },
    { "questionId": "<q2-id>", "selectedOption": 0 },
    { "questionId": "<q3-id>", "selectedOption": 2 },
    { "questionId": "<q4-id>", "selectedOption": 0 },
    { "questionId": "<q5-id>", "selectedOption": 2 }
  ]
}

Expected Result: 3/5 (60%)
```

### 5.6 API Testing with cURL

#### Register New User

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "curl-test@example.com",
    "password": "password123",
    "name": "cURL Test User",
    "role": "STUDENT"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@demo.com",
    "password": "password123"
  }'
```

Save the token from the response for subsequent requests.

#### Get Current User

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### List Quizzes

```bash
curl "http://localhost:3001/quizzes?published=true" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Create Quiz (Teacher Only)

```bash
curl -X POST http://localhost:3001/quizzes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEACHER_TOKEN_HERE" \
  -d '{
    "title": "cURL Test Quiz",
    "description": "Created via cURL",
    "timeLimit": 15,
    "questions": [
      {
        "text": "Is this a test question?",
        "options": ["Yes", "No", "Maybe", "I don'\''t know"],
        "correctOption": 0,
        "explanation": "This is indeed a test question.",
        "order": 1
      }
    ]
  }'
```

#### Start Quiz Submission

```bash
curl -X POST http://localhost:3001/submissions/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE" \
  -d '{
    "quizId": "QUIZ_ID_HERE"
  }'
```

#### Submit Answers

```bash
curl -X POST http://localhost:3001/submissions/SUBMISSION_ID/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer STUDENT_TOKEN_HERE" \
  -d '{
    "answers": [
      { "questionId": "Q1_ID", "selectedOption": 0 }
    ]
  }'
```

---

## 6. Demo Script for Client Presentations

### Demo Scenario: Complete User Journey

**Preparation:**
1. Ensure both API and UI are running (`npm run dev`)
2. Database is seeded with demo data
3. Have two browser windows ready (one for teacher, one for student)

### Part 1: Teacher Experience (5 minutes)

**Step 1: Teacher Login**
```
Navigate to: http://localhost:3000/login
Email:       teacher@demo.com
Password:    password123
```

**Step 2: Create a New Quiz**
```
Click: "Create Quiz" button

Quiz Details:
  Title:       "Demo: Web Development Basics"
  Description: "Quick quiz on HTML, CSS, and JavaScript fundamentals"
  Time Limit:  10 minutes

Questions:

Question 1:
  Text:     "What does HTML stand for?"
  Options:  
    A) Hyper Text Markup Language
    B) High Tech Modern Language
    C) Hyper Transfer Markup Language
    D) Home Tool Markup Language
  Correct:  A (index 0)
  Explanation: "HTML is the standard markup language for creating web pages."

Question 2:
  Text:     "Which CSS property is used to change text color?"
  Options:
    A) font-color
    B) text-color
    C) color
    D) text-style
  Correct:  C (index 2)
  Explanation: "The 'color' property sets the color of text content."

Question 3:
  Text:     "Which symbol is used for single-line comments in JavaScript?"
  Options:
    A) /* */
    B) //
    C) #
    D) --
  Correct:  B (index 1)
  Explanation: "Double forward slashes (//) create single-line comments in JS."
```

**Step 3: Publish the Quiz**
```
Toggle: "Published" to ON
Click:  "Create Quiz"
```

### Part 2: Student Experience (5 minutes)

**Step 1: Student Login (Second Browser)**
```
Navigate to: http://localhost:3000/login
Email:       student@demo.com
Password:    password123
```

**Step 2: Browse Available Quizzes**
```
View the quiz list
Find "Demo: Web Development Basics"
Click: "Take Quiz"
```

**Step 3: Take the Quiz**
```
Answer questions:
  Question 1: Select "Hyper Text Markup Language"
  Question 2: Select "color"
  Question 3: Select "//"

Click: "Submit Quiz"
Confirm submission
```

**Step 4: View Results**
```
Show the results page:
- Score: 3/3 (100%)
- Each question with correct/incorrect indicators
- Explanations visible
```

### Part 3: Teacher Analytics (2 minutes)

**Back to Teacher Browser:**
```
Navigate to: Quiz Submissions
Select: "Demo: Web Development Basics"

Show:
- Total submissions count
- Average score
- Individual student results
```

### Demo Talking Points

- Mention the JWT authentication approach and its benefits
- Highlight the role-based access control
- Show the immediate feedback for students
- Mention the AI-assisted development process used to build it
- Discuss potential production enhancements (Azure AD B2C, real-time features)

---

## 7. Security Testing

### 7.1 Authentication Security

| Test | Method | Expected Result | Status |
|------|--------|-----------------|--------|
| Access protected route without token | GET /quizzes (no header) | 401 Unauthorized | |
| Access with invalid token | GET /quizzes + "Bearer invalid" | 401 Unauthorized | |
| Access with expired token | GET /quizzes + expired token | 401 Unauthorized | |
| Student access teacher route | POST /quizzes (student token) | 403 Forbidden | |
| Teacher edit other's quiz | PUT /quizzes/:id (wrong owner) | 403 Forbidden | |

### 7.2 Input Validation Security

| Test | Input | Expected Result | Status |
|------|-------|-----------------|--------|
| SQL injection in search | `'; DROP TABLE users; --` | Escaped, no effect | |
| XSS in quiz title | `<script>alert('xss')</script>` | Escaped in output | |
| Oversized payload | Quiz with 1000 questions | 400 Bad Request | |
| Invalid UUID format | GET /quizzes/not-a-uuid | 400 or 404 | |

### 7.3 Password Security Verification

```bash
# Verify password is hashed in database
docker exec -it quizmaster-db psql -U postgres -d quizmaster \
  -c "SELECT email, password FROM users LIMIT 1;"

# Password should be bcrypt hash starting with $2b$
```

---

## 8. Test Execution Schedule

### During Development (Days 1-3)

| Time | Activity |
|------|----------|
| After each feature | Run related unit tests |
| End of day | Run full test suite |
| Before PR/merge | All tests must pass |

### Final Testing (Day 4)

| Time | Activity | Duration |
|------|----------|----------|
| Morning | Run all unit and E2E tests | 1 hour |
| Morning | Fix any failing tests | 1 hour |
| Afternoon | Complete manual testing checklist | 2 hours |
| Afternoon | Run demo script end-to-end | 30 min |
| Afternoon | Cross-browser testing | 30 min |

---

## 9. Bug Report Template

```markdown
## Bug Report

**Title:** [Brief description]

**Severity:** Critical | High | Medium | Low

**Environment:**
- Browser: Chrome 120
- OS: Windows 11
- User Role: Student

**Steps to Reproduce:**
1. Login as student@demo.com
2. Navigate to quiz list
3. Click "Take Quiz" on JavaScript Fundamentals
4. [Continue with specific steps]

**Expected Result:**
Timer should start at 30:00

**Actual Result:**
Timer shows NaN:NaN

**Screenshots:**
[Attach if applicable]

**Console Errors:**
```
TypeError: Cannot read property 'timeLimit' of undefined
```

**Additional Notes:**
[Any other relevant information]
```

---

## 10. Test Coverage Targets

### Backend (NestJS)

| Module | Target Coverage |
|--------|-----------------|
| AuthService | 90% |
| QuizzesService | 80% |
| SubmissionsService | 80% |
| Guards | 90% |
| Controllers | 70% |

### Frontend (Next.js)

| Component Type | Target Coverage |
|----------------|-----------------|
| Quiz components | 80% |
| Form components | 70% |
| Utility functions | 90% |
| API client | 60% |

**Generate Coverage Reports:**

```bash
# Backend
cd quizmaster-api
npm run test:cov

# Frontend
cd quizmaster-ui
npm run test -- --coverage
```

---

## Summary

This testing plan provides:

- Unit tests for core business logic
- E2E tests for critical user flows
- Comprehensive manual testing checklist
- Specific test data for all forms and scenarios
- Demo script for client presentations
- Security testing coverage
- Clear execution schedule

Remember: For the MVP demo, prioritize the manual testing checklist and demo script. Automated tests can be expanded post-MVP based on time constraints.
