import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QuizzesService } from './quizzes.service';

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
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            question: {
              updateMany: jest.fn(),
            },
            $transaction: jest.fn((callback) =>
              callback({
                quiz: {
                  create: jest.fn(),
                  update: jest.fn(),
                },
                question: {
                  updateMany: jest.fn(),
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a quiz with questions', async () => {
      const createQuizDto: CreateQuizDto = {
        title: 'JavaScript Fundamentals',
        description: 'Test your JS knowledge',
        timeLimit: 30,
        questions: [
          {
            text: 'What is the output of typeof null?',
            options: ['null', 'undefined', 'object', 'number'],
            correctOption: 2,
            explanation:
              'typeof null returns "object" due to a historical bug.',
            order: 1,
          },
        ],
      };

      const teacherId = 'teacher-uuid';
      const expectedQuiz = {
        id: 'quiz-uuid',
        ...createQuizDto,
        teacherId,
        published: false,
        teacher: {
          id: teacherId,
          name: 'Test Teacher',
          email: 'teacher@test.com',
        },
        questions: createQuizDto.questions.map((q, idx) => ({
          id: `q-${idx}`,
          ...q,
        })),
      };

      const mockTransaction = jest.fn((callback) => {
        const tx = {
          quiz: {
            create: jest.fn().mockResolvedValue(expectedQuiz),
          },
        };
        return callback(tx);
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(mockTransaction);

      const result = await service.create(createQuizDto, teacherId);

      expect(result).toEqual(expectedQuiz);
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated quizzes', async () => {
      const quizzes = [
        {
          id: '1',
          title: 'Quiz 1',
          published: true,
          teacher: { id: 't1', name: 'Teacher 1', email: 't1@test.com' },
          _count: { questions: 5 },
        },
        {
          id: '2',
          title: 'Quiz 2',
          published: true,
          teacher: { id: 't2', name: 'Teacher 2', email: 't2@test.com' },
          _count: { questions: 3 },
        },
      ];

      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue(quizzes as any);
      jest.spyOn(prisma.quiz, 'count').mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.data[0].questionCount).toBe(5);
    });

    it('should filter by published status', async () => {
      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.quiz, 'count').mockResolvedValue(0);

      await service.findAll({ published: true });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            published: true,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should filter by teacherId', async () => {
      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.quiz, 'count').mockResolvedValue(0);

      await service.findAll({ teacherId: 'teacher-id' });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teacherId: 'teacher-id',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should search by title or description', async () => {
      jest.spyOn(prisma.quiz, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.quiz, 'count').mockResolvedValue(0);

      await service.findAll({ search: 'javascript' });

      expect(prisma.quiz.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'javascript', mode: 'insensitive' } },
              { description: { contains: 'javascript', mode: 'insensitive' } },
            ],
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a quiz by id', async () => {
      const quiz = {
        id: 'quiz-id',
        title: 'Test Quiz',
        teacher: { id: 't1', name: 'Teacher', email: 't@test.com' },
        questions: [{ id: 'q1', text: 'Question 1', order: 1 }],
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      const result = await service.findOne('quiz-id');

      expect(result).toEqual(quiz);
      expect(prisma.quiz.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'quiz-id',
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update quiz if user is owner', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
        title: 'Old Title',
        _count: { submissions: 0 },
      };

      const updatedQuiz = {
        ...quiz,
        title: 'New Title',
        teacher: { id: 'teacher-id', name: 'Teacher', email: 't@test.com' },
        questions: [],
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      const mockTransaction = jest.fn((callback) => {
        const tx = {
          question: {
            updateMany: jest.fn(),
          },
          quiz: {
            update: jest.fn().mockResolvedValue(updatedQuiz),
          },
        };
        return callback(tx);
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(mockTransaction);

      const result = await service.update(
        'quiz-id',
        { title: 'New Title' },
        'teacher-id',
      );

      expect(result.title).toBe('New Title');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
        _count: { submissions: 0 },
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      await expect(
        service.update('quiz-id', { title: 'New Title' }, 'other-teacher'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', { title: 'New Title' }, 'teacher-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if quiz has submissions', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
        _count: { submissions: 5 },
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      await expect(
        service.update('quiz-id', { title: 'New Title' }, 'teacher-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update questions when provided', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
        title: 'Old Title',
        _count: { submissions: 0 },
      };

      const updatedQuiz = {
        ...quiz,
        title: 'New Title',
        teacher: { id: 'teacher-id', name: 'Teacher', email: 't@test.com' },
        questions: [{ id: 'q1', text: 'New Question', order: 1 }],
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      const mockUpdateMany = jest.fn();
      const mockUpdate = jest.fn().mockResolvedValue(updatedQuiz);

      const mockTransaction = jest.fn((callback) => {
        const tx = {
          question: {
            updateMany: mockUpdateMany,
          },
          quiz: {
            update: mockUpdate,
          },
        };
        return callback(tx);
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(mockTransaction);

      const updateDto: UpdateQuizDto = {
        title: 'New Title',
        questions: [
          {
            text: 'New Question',
            options: ['A', 'B', 'C', 'D'],
            correctOption: 0,
            explanation: 'Explanation',
            order: 1,
          },
        ],
      };

      await service.update('quiz-id', updateDto, 'teacher-id');

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { quizId: 'quiz-id' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete quiz if user is owner', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
        title: 'Test Quiz',
      };

      const deletedQuiz = {
        ...quiz,
        deletedAt: new Date(),
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);
      jest.spyOn(prisma.quiz, 'update').mockResolvedValue(deletedQuiz as any);

      const result = await service.remove('quiz-id', 'teacher-id');

      expect(result.deletedAt).toBeDefined();
      expect(prisma.quiz.update).toHaveBeenCalledWith({
        where: { id: 'quiz-id' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);

      await expect(service.remove('quiz-id', 'other-teacher')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(
        service.remove('nonexistent-id', 'teacher-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
