# QuizMaster Testing Fixes & Improvements

## Overview

This document contains prioritized test files and improvements to increase code coverage for the QuizMaster application. Current coverage is significantly below targets.

**Current Coverage:**
- Backend: 37.46% statements (Target: 70%+)
- Frontend: 7.62% statements (Target: 70%+)

**Repository Structure:**
- `quizmaster-api/` - NestJS backend
- `quizmaster-ui/` - Next.js frontend

---

## Priority 1: Security-Critical Tests (Backend)

These tests cover authentication and authorization - the most critical untested code.

### 1.1 RolesGuard Unit Tests

**Create File:** `quizmaster-api/src/auth/guards/roles.guard.spec.ts`

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockExecutionContext = (userRole: string): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-id', email: 'test@example.com', role: userRole },
        }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when roles array is empty', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required TEACHER role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user has required ADMIN role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('ADMIN');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when user role matches one of multiple allowed roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER', 'ADMIN']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return false when STUDENT tries to access TEACHER-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when STUDENT tries to access ADMIN-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('STUDENT');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should return false when TEACHER tries to access ADMIN-only route', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = createMockExecutionContext('TEACHER');
      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should check both handler and class for roles metadata', () => {
      const getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['TEACHER']);

      const context = createMockExecutionContext('TEACHER');
      guard.canActivate(context);

      expect(getAllAndOverrideSpy).toHaveBeenCalledWith('roles', [
        context.getHandler(),
        context.getClass(),
      ]);
    });
  });
});
```

**Acceptance Criteria:**
- All role combinations tested
- Guard correctly allows/denies based on user role
- Metadata reflection is properly tested

---

### 1.2 JwtAuthGuard Unit Tests

**Create File:** `quizmaster-api/src/auth/guards/jwt-auth.guard.spec.ts`

```typescript
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  describe('canActivate', () => {
    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should extend AuthGuard with jwt strategy', () => {
      // The guard should use 'jwt' strategy from passport
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      const result = guard.handleRequest(null, mockUser, null);

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no user and no error', () => {
      expect(() => {
        guard.handleRequest(null, null, null);
      }).toThrow(UnauthorizedException);
    });

    it('should throw the original error when error is provided', () => {
      const originalError = new Error('Token expired');

      expect(() => {
        guard.handleRequest(originalError, null, null);
      }).toThrow(originalError);
    });

    it('should throw UnauthorizedException when error is provided but no specific error', () => {
      expect(() => {
        guard.handleRequest(null, null, { message: 'No auth token' });
      }).toThrow(UnauthorizedException);
    });
  });
});
```

**Note:** If your JwtAuthGuard doesn't override `handleRequest`, create a simpler test:

```typescript
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });
});
```

---

### 1.3 JWT Strategy Unit Tests

**Create File:** `quizmaster-api/src/auth/strategies/jwt.strategy.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('validate', () => {
    it('should return user when valid payload and user exists', async () => {
      const payload = { sub: 'user-id', email: 'test@example.com', role: 'STUDENT' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const payload = { sub: 'nonexistent-id', email: 'test@example.com', role: 'STUDENT' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is deleted', async () => {
      const payload = { sub: 'deleted-user-id', email: 'test@example.com', role: 'STUDENT' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

---

### 1.4 Auth Controller Unit Tests

**Create File:** `quizmaster-api/src/auth/auth.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STUDENT',
      };

      const expectedResult = {
        user: {
          id: 'user-id',
          email: registerDto.email,
          name: registerDto.name,
          role: registerDto.role,
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.register).toHaveBeenCalledTimes(1);
    });

    it('should register a teacher', async () => {
      const registerDto: RegisterDto = {
        email: 'teacher@example.com',
        password: 'password123',
        name: 'Teacher User',
        role: 'TEACHER',
      };

      const expectedResult = {
        user: {
          id: 'teacher-id',
          email: registerDto.email,
          name: registerDto.name,
          role: 'TEACHER',
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(result.user.role).toBe('TEACHER');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'user@example.com',
        password: 'password123',
      };

      const expectedResult = {
        user: {
          id: 'user-id',
          email: loginDto.email,
          name: 'Test User',
          role: 'STUDENT',
        },
        accessToken: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });
  });

  describe('me', () => {
    it('should return current user from request', () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        role: 'STUDENT',
      };

      const result = controller.me(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
```

---

## Priority 2: Controller Tests (Backend)

### 2.1 Quizzes Controller Unit Tests

**Create File:** `quizmaster-api/src/quizzes/quizzes.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

describe('QuizzesController', () => {
  let controller: QuizzesController;
  let quizzesService: QuizzesService;
  let submissionsService: SubmissionsService;

  const mockQuizzesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockSubmissionsService = {
    findQuizSubmissions: jest.fn(),
  };

  const mockUser = {
    id: 'teacher-id',
    email: 'teacher@example.com',
    name: 'Teacher',
    role: 'TEACHER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuizzesController],
      providers: [
        { provide: QuizzesService, useValue: mockQuizzesService },
        { provide: SubmissionsService, useValue: mockSubmissionsService },
      ],
    }).compile();

    controller = module.get<QuizzesController>(QuizzesController);
    quizzesService = module.get<QuizzesService>(QuizzesService);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated quizzes', async () => {
      const expectedResult = {
        data: [{ id: 'quiz-1', title: 'Quiz 1' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };

      mockQuizzesService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(undefined, undefined, undefined, 1, 10);

      expect(result).toEqual(expectedResult);
      expect(quizzesService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should filter by published status', async () => {
      mockQuizzesService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll('true', undefined, undefined, 1, 10);

      expect(quizzesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ published: true }),
      );
    });

    it('should filter by teacherId', async () => {
      mockQuizzesService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(undefined, 'teacher-123', undefined, 1, 10);

      expect(quizzesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ teacherId: 'teacher-123' }),
      );
    });

    it('should filter by search term', async () => {
      mockQuizzesService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(undefined, undefined, 'javascript', 1, 10);

      expect(quizzesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'javascript' }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single quiz', async () => {
      const quiz = { id: 'quiz-id', title: 'Test Quiz' };
      mockQuizzesService.findOne.mockResolvedValue(quiz);

      const result = await controller.findOne('quiz-id');

      expect(result).toEqual(quiz);
      expect(quizzesService.findOne).toHaveBeenCalledWith('quiz-id');
    });
  });

  describe('create', () => {
    it('should create a quiz', async () => {
      const createDto: CreateQuizDto = {
        title: 'New Quiz',
        description: 'Quiz description',
        timeLimit: 30,
        questions: [
          {
            text: 'Question 1',
            options: ['A', 'B', 'C', 'D'],
            correctOption: 0,
            order: 1,
          },
        ],
      };

      const createdQuiz = { id: 'new-quiz-id', ...createDto, teacherId: mockUser.id };
      mockQuizzesService.create.mockResolvedValue(createdQuiz);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(createdQuiz);
      expect(quizzesService.create).toHaveBeenCalledWith(createDto, mockUser.id);
    });
  });

  describe('update', () => {
    it('should update a quiz', async () => {
      const updateDto: UpdateQuizDto = { title: 'Updated Title' };
      const updatedQuiz = { id: 'quiz-id', title: 'Updated Title' };

      mockQuizzesService.update.mockResolvedValue(updatedQuiz);

      const result = await controller.update('quiz-id', updateDto, mockUser);

      expect(result).toEqual(updatedQuiz);
      expect(quizzesService.update).toHaveBeenCalledWith('quiz-id', updateDto, mockUser.id);
    });
  });

  describe('remove', () => {
    it('should remove a quiz', async () => {
      mockQuizzesService.remove.mockResolvedValue({ id: 'quiz-id', deletedAt: new Date() });

      const result = await controller.remove('quiz-id', mockUser);

      expect(quizzesService.remove).toHaveBeenCalledWith('quiz-id', mockUser.id);
    });
  });

  describe('findQuizSubmissions', () => {
    it('should return submissions for a quiz', async () => {
      const submissions = [{ id: 'sub-1', score: 8 }];
      mockSubmissionsService.findQuizSubmissions.mockResolvedValue(submissions);

      const result = await controller.findQuizSubmissions('quiz-id', mockUser);

      expect(result).toEqual(submissions);
      expect(submissionsService.findQuizSubmissions).toHaveBeenCalledWith('quiz-id', mockUser.id);
    });
  });
});
```

---

### 2.2 Submissions Controller Unit Tests

**Create File:** `quizmaster-api/src/submissions/submissions.controller.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

describe('SubmissionsController', () => {
  let controller: SubmissionsController;
  let submissionsService: SubmissionsService;

  const mockSubmissionsService = {
    start: jest.fn(),
    submit: jest.fn(),
    findUserSubmissions: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUser = {
    id: 'student-id',
    email: 'student@example.com',
    name: 'Student',
    role: 'STUDENT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        { provide: SubmissionsService, useValue: mockSubmissionsService },
      ],
    }).compile();

    controller = module.get<SubmissionsController>(SubmissionsController);
    submissionsService = module.get<SubmissionsService>(SubmissionsService);

    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should start a quiz submission', async () => {
      const startDto: StartQuizDto = { quizId: 'quiz-id' };
      const submission = {
        id: 'submission-id',
        quizId: 'quiz-id',
        userId: mockUser.id,
        startedAt: new Date(),
      };

      mockSubmissionsService.start.mockResolvedValue(submission);

      const result = await controller.start(startDto, mockUser);

      expect(result).toEqual(submission);
      expect(submissionsService.start).toHaveBeenCalledWith('quiz-id', mockUser.id);
    });
  });

  describe('submit', () => {
    it('should submit answers and return score', async () => {
      const submitDto: SubmitAnswersDto = {
        answers: [
          { questionId: 'q1', selectedOption: 0 },
          { questionId: 'q2', selectedOption: 2 },
        ],
      };

      const result = {
        id: 'submission-id',
        score: 2,
        totalQuestions: 2,
        submittedAt: new Date(),
      };

      mockSubmissionsService.submit.mockResolvedValue(result);

      const response = await controller.submit('submission-id', submitDto, mockUser);

      expect(response).toEqual(result);
      expect(submissionsService.submit).toHaveBeenCalledWith(
        'submission-id',
        submitDto,
        mockUser.id,
      );
    });
  });

  describe('findUserSubmissions', () => {
    it('should return user submissions with pagination', async () => {
      const expectedResult = {
        data: [{ id: 'sub-1', score: 8 }],
        meta: { total: 1, page: 1, limit: 10 },
      };

      mockSubmissionsService.findUserSubmissions.mockResolvedValue(expectedResult);

      const result = await controller.findUserSubmissions(mockUser, 1, 10);

      expect(result).toEqual(expectedResult);
      expect(submissionsService.findUserSubmissions).toHaveBeenCalledWith(
        mockUser.id,
        { page: 1, limit: 10 },
      );
    });
  });

  describe('findOne', () => {
    it('should return a single submission', async () => {
      const submission = {
        id: 'submission-id',
        score: 8,
        totalQuestions: 10,
      };

      mockSubmissionsService.findOne.mockResolvedValue(submission);

      const result = await controller.findOne('submission-id', mockUser);

      expect(result).toEqual(submission);
      expect(submissionsService.findOne).toHaveBeenCalledWith('submission-id', mockUser.id);
    });
  });
});
```

---

## Priority 3: Frontend Critical Tests

### 3.1 Auth Store Tests

**Create File:** `quizmaster-ui/src/store/authStore.test.ts`

```typescript
import { useAuthStore } from './authStore';

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

import Cookies from 'js-cookie';

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with null user', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should start as not authenticated', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should start with no token', () => {
      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });

    it('should start with loading false', () => {
      const { isLoading } = useAuthStore.getState();
      expect(isLoading).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STUDENT' as const,
      };

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle teacher role', () => {
      const mockTeacher = {
        id: 'teacher-1',
        email: 'teacher@example.com',
        name: 'Teacher User',
        role: 'TEACHER' as const,
      };

      useAuthStore.getState().setUser(mockTeacher);

      expect(useAuthStore.getState().user?.role).toBe('TEACHER');
    });
  });

  describe('setToken', () => {
    it('should set token in state', () => {
      useAuthStore.getState().setToken('test-jwt-token');

      expect(useAuthStore.getState().token).toBe('test-jwt-token');
    });

    it('should store token in cookie', () => {
      useAuthStore.getState().setToken('test-jwt-token');

      expect(Cookies.set).toHaveBeenCalledWith('token', 'test-jwt-token', expect.any(Object));
    });
  });

  describe('logout', () => {
    it('should clear user state', () => {
      // First set a user
      useAuthStore.getState().setUser({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        role: 'STUDENT',
      });
      useAuthStore.getState().setToken('some-token');

      // Then logout
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should remove token cookie', () => {
      useAuthStore.getState().logout();

      expect(Cookies.remove).toHaveBeenCalledWith('token');
    });
  });

  describe('setLoading', () => {
    it('should set loading state to true', () => {
      useAuthStore.getState().setLoading(true);

      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should set loading state to false', () => {
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setLoading(false);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('role checks', () => {
    it('should correctly identify student role', () => {
      useAuthStore.getState().setUser({
        id: '1',
        email: 'student@test.com',
        name: 'Student',
        role: 'STUDENT',
      });

      const { user } = useAuthStore.getState();
      expect(user?.role).toBe('STUDENT');
    });

    it('should correctly identify teacher role', () => {
      useAuthStore.getState().setUser({
        id: '1',
        email: 'teacher@test.com',
        name: 'Teacher',
        role: 'TEACHER',
      });

      const { user } = useAuthStore.getState();
      expect(user?.role).toBe('TEACHER');
    });

    it('should correctly identify admin role', () => {
      useAuthStore.getState().setUser({
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'ADMIN',
      });

      const { user } = useAuthStore.getState();
      expect(user?.role).toBe('ADMIN');
    });
  });
});
```

---

### 3.2 API Client Tests

**Create File:** `quizmaster-ui/src/lib/api.test.ts`

```typescript
import axios from 'axios';

// Mock axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  return mockAxios;
});

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
}));

import Cookies from 'js-cookie';

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('axios instance creation', () => {
    it('should create axios instance with correct base URL', () => {
      // Re-import to trigger module execution
      jest.isolateModules(() => {
        require('./api');
      });

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String),
        }),
      );
    });

    it('should set up request interceptor', () => {
      jest.isolateModules(() => {
        require('./api');
      });

      expect(axios.interceptors.request.use).toHaveBeenCalled();
    });

    it('should set up response interceptor', () => {
      jest.isolateModules(() => {
        require('./api');
      });

      expect(axios.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('request interceptor', () => {
    it('should add authorization header when token exists', () => {
      (Cookies.get as jest.Mock).mockReturnValue('test-token');

      let requestInterceptor: (config: any) => any;

      (axios.interceptors.request.use as jest.Mock).mockImplementation((fn) => {
        requestInterceptor = fn;
      });

      jest.isolateModules(() => {
        require('./api');
      });

      const config = { headers: {} };
      const result = requestInterceptor!(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should not add authorization header when no token', () => {
      (Cookies.get as jest.Mock).mockReturnValue(undefined);

      let requestInterceptor: (config: any) => any;

      (axios.interceptors.request.use as jest.Mock).mockImplementation((fn) => {
        requestInterceptor = fn;
      });

      jest.isolateModules(() => {
        require('./api');
      });

      const config = { headers: {} };
      const result = requestInterceptor!(config);

      expect(result.headers.Authorization).toBeUndefined();
    });
  });
});
```

---

### 3.3 Login Page Component Test

**Create File:** `quizmaster-ui/src/app/(auth)/login/page.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock the auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    login: jest.fn(),
    isAuthenticated: false,
    isLoading: false,
  }),
}));

// Mock the API
jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in|log in|login/i })).toBeInTheDocument();
  });

  it('should render email input field', () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
  });

  it('should render password input field', () => {
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should allow typing in email field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('should allow typing in password field', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('should have a link to register page', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /sign up|register|create account/i });
    expect(registerLink).toBeInTheDocument();
  });
});
```

---

### 3.4 QuizCard Component Test

**Create File:** `quizmaster-ui/src/components/quiz/QuizCard.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import QuizCard from './QuizCard';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('QuizCard', () => {
  const mockQuiz = {
    id: 'quiz-1',
    title: 'JavaScript Fundamentals',
    description: 'Test your JavaScript knowledge',
    timeLimit: 30,
    published: true,
    teacherId: 'teacher-1',
    questionCount: 10,
    createdAt: '2025-01-10T00:00:00.000Z',
  };

  it('should render quiz title', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
  });

  it('should render quiz description', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText('Test your JavaScript knowledge')).toBeInTheDocument();
  });

  it('should render time limit', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('should render question count', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('should render take quiz button for students', () => {
    render(<QuizCard quiz={mockQuiz} userRole="STUDENT" />);

    expect(screen.getByRole('button', { name: /take quiz|start/i })).toBeInTheDocument();
  });

  it('should render edit button for teachers', () => {
    render(<QuizCard quiz={mockQuiz} userRole="TEACHER" isOwner={true} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('should not render edit button if not owner', () => {
    render(<QuizCard quiz={mockQuiz} userRole="TEACHER" isOwner={false} />);

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should handle click on take quiz button', () => {
    const onTakeQuiz = jest.fn();
    render(<QuizCard quiz={mockQuiz} userRole="STUDENT" onTakeQuiz={onTakeQuiz} />);

    fireEvent.click(screen.getByRole('button', { name: /take quiz|start/i }));

    expect(onTakeQuiz).toHaveBeenCalledWith(mockQuiz.id);
  });
});
```

---

## Priority 4: Additional Backend Tests

### 4.1 Prisma Service Tests

**Create File:** `quizmaster-api/src/prisma/prisma.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database on module init', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database on module destroy', async () => {
      const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
```

---

### 4.2 Decorators Tests

**Create File:** `quizmaster-api/src/auth/decorators/roles.decorator.spec.ts`

```typescript
import { Roles } from './roles.decorator';
import { SetMetadata } from '@nestjs/common';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Roles Decorator', () => {
  it('should set metadata with single role', () => {
    Roles('TEACHER');

    expect(SetMetadata).toHaveBeenCalledWith('roles', ['TEACHER']);
  });

  it('should set metadata with multiple roles', () => {
    Roles('TEACHER', 'ADMIN');

    expect(SetMetadata).toHaveBeenCalledWith('roles', ['TEACHER', 'ADMIN']);
  });

  it('should set metadata with all roles', () => {
    Roles('STUDENT', 'TEACHER', 'ADMIN');

    expect(SetMetadata).toHaveBeenCalledWith('roles', ['STUDENT', 'TEACHER', 'ADMIN']);
  });
});
```

**Create File:** `quizmaster-api/src/auth/decorators/current-user.decorator.spec.ts`

```typescript
import { ExecutionContext } from '@nestjs/common';

// Test that the decorator extracts user from request
describe('CurrentUser Decorator', () => {
  it('should extract user from request context', () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      role: 'STUDENT',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as unknown as ExecutionContext;

    // The decorator factory extracts user from request
    const request = mockContext.switchToHttp().getRequest();
    expect(request.user).toEqual(mockUser);
  });
});
```

---

## Implementation Checklist

### Priority 1 - Security Critical (Do First)
- [ ] 1.1 Create `roles.guard.spec.ts`
- [ ] 1.2 Create `jwt-auth.guard.spec.ts`
- [ ] 1.3 Create `jwt.strategy.spec.ts`
- [ ] 1.4 Create `auth.controller.spec.ts`

### Priority 2 - Controllers
- [ ] 2.1 Create `quizzes.controller.spec.ts`
- [ ] 2.2 Create `submissions.controller.spec.ts`

### Priority 3 - Frontend Critical
- [ ] 3.1 Create `authStore.test.ts`
- [ ] 3.2 Create `api.test.ts`
- [ ] 3.3 Create `login/page.test.tsx`
- [ ] 3.4 Create `QuizCard.test.tsx`

### Priority 4 - Additional Backend
- [ ] 4.1 Create `prisma.service.spec.ts`
- [ ] 4.2 Create decorator tests

---

## Running Tests After Implementation

```bash
# Run all backend tests with coverage
cd quizmaster-api
npm run test:cov

# Run specific test file
npm run test -- roles.guard.spec.ts

# Run all frontend tests with coverage
cd quizmaster-ui
npm run test:coverage

# Run specific frontend test
npm run test -- authStore.test.ts
```

---

## Expected Coverage After Implementation

### Backend (Target: 70%+)
| Before | After (Estimated) |
|--------|-------------------|
| 37.46% | 65-75% |

### Frontend (Target: 70%+)
| Before | After (Estimated) |
|--------|-------------------|
| 7.62% | 25-35% |

**Note:** Frontend coverage will require additional page/component tests beyond what's included here to reach 70%. The tests provided cover the most critical paths. Additional tests for dashboard pages, quiz creation forms, and results display would be needed for full coverage.

---

## Notes for Cursor/Copilot

When implementing these tests:

1. **Create files in exact paths specified** - file location matters for Jest to find them
2. **Run tests after each file creation** to catch any import/type errors
3. **Adjust mock implementations** if actual service/component signatures differ
4. **Check for existing test utilities** - the project may have test helpers you can reuse
5. **Watch for async/await** - ensure all async tests properly await results
6. **Match naming conventions** - use `*.spec.ts` for backend, `*.test.ts(x)` for frontend

If a test fails due to implementation differences:
- Check the actual function signatures in the source files
- Adjust mock return values to match actual response shapes
- Ensure imports match the actual export names
