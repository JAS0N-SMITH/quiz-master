import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        {
          provide: PrismaService,
          useValue: {
            quiz: {
              findFirst: jest.fn(),
            },
            submission: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
            question: {
              findMany: jest.fn(),
            },
            answer: {
              createMany: jest.fn(),
            },
            $transaction: jest.fn((callback) =>
              callback({
                answer: {
                  createMany: jest.fn(),
                },
                submission: {
                  update: jest.fn(),
                },
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('start', () => {
    it('should create a submission for a published quiz', async () => {
      const quiz = {
        id: 'quiz-id',
        title: 'Test Quiz',
        published: true,
        questions: [
          { id: 'q1', text: 'Question 1', order: 1 },
          { id: 'q2', text: 'Question 2', order: 2 },
        ],
      };

      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        totalQuestions: 2,
        quiz,
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prisma.submission, 'create')
        .mockResolvedValue(submission as any);

      const result = await service.start('quiz-id', 'student-id');

      expect(result).toEqual(submission);
      expect(prisma.quiz.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'quiz-id',
          deletedAt: null,
          published: true,
        },
        include: expect.any(Object),
      });
      expect(prisma.submission.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(
        service.start('nonexistent-id', 'student-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if quiz is not published', async () => {
      // When quiz is not published, findFirst returns null because where clause includes published: true
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(service.start('quiz-id', 'student-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if active submission exists', async () => {
      const quiz = {
        id: 'quiz-id',
        published: true,
        questions: [],
      };

      const activeSubmission = {
        id: 'active-sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        submittedAt: null,
      };

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);
      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(activeSubmission as any);

      await expect(service.start('quiz-id', 'student-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submit', () => {
    it('should calculate score correctly', async () => {
      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        submittedAt: null,
        quiz: {
          questions: [
            { id: 'q1', correctOption: 0 },
            { id: 'q2', correctOption: 1 },
            { id: 'q3', correctOption: 2 },
            { id: 'q4', correctOption: 3 },
            { id: 'q5', correctOption: 0 },
          ],
        },
      };

      const answers = [
        { questionId: 'q1', selectedOption: 0 }, // Correct
        { questionId: 'q2', selectedOption: 0 }, // Incorrect
        { questionId: 'q3', selectedOption: 2 }, // Correct
        { questionId: 'q4', selectedOption: 3 }, // Correct
        { questionId: 'q5', selectedOption: 1 }, // Incorrect
      ];

      const submitDto: SubmitAnswersDto = { answers };

      const updatedSubmission = {
        ...submission,
        score: 3,
        totalQuestions: 5,
        submittedAt: new Date(),
        answers: answers.map((a) => ({
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          isCorrect: ['q1', 'q3', 'q4'].includes(a.questionId),
        })),
      };

      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(submission as any);

      const mockCreateMany = jest.fn();
      const mockUpdate = jest.fn().mockResolvedValue(updatedSubmission);

      const mockTransaction = jest.fn((callback) => {
        const tx = {
          answer: {
            createMany: mockCreateMany,
          },
          submission: {
            update: mockUpdate,
          },
        };
        return callback(tx);
      });

      jest.spyOn(prisma, '$transaction').mockImplementation(mockTransaction);

      const result = await service.submit('sub-id', submitDto, 'student-id');

      expect(result.score).toBe(3);
      expect(mockCreateMany).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'sub-id' },
        data: {
          score: 3,
          submittedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });
    });

    it('should reject submission if not all questions answered', async () => {
      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        submittedAt: null,
        quiz: {
          questions: [
            { id: 'q1', correctOption: 0 },
            { id: 'q2', correctOption: 1 },
            { id: 'q3', correctOption: 2 },
          ],
        },
      };

      const answers = [
        { questionId: 'q1', selectedOption: 0 },
        { questionId: 'q2', selectedOption: 1 },
        // Missing q3
      ];

      const submitDto: SubmitAnswersDto = { answers };

      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(submission as any);

      await expect(
        service.submit('sub-id', submitDto, 'student-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if submission belongs to different user', async () => {
      // When submission belongs to different user, findFirst returns null because where clause includes userId
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);

      await expect(
        service.submit('sub-id', { answers: [] }, 'student-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);

      await expect(
        service.submit('nonexistent-id', { answers: [] }, 'student-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already submitted', async () => {
      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        submittedAt: new Date(),
        quiz: {
          questions: [],
        },
      };

      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(submission as any);

      await expect(
        service.submit('sub-id', { answers: [] }, 'student-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if question not found in quiz', async () => {
      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        quizId: 'quiz-id',
        submittedAt: null,
        quiz: {
          questions: [{ id: 'q1', correctOption: 0 }],
        },
      };

      const answers = [
        { questionId: 'q1', selectedOption: 0 },
        { questionId: 'q2', selectedOption: 1 }, // q2 doesn't exist in quiz
      ];

      const submitDto: SubmitAnswersDto = { answers };

      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(submission as any);

      await expect(
        service.submit('sub-id', submitDto, 'student-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserSubmissions', () => {
    it('should return paginated user submissions', async () => {
      const submissions = [
        {
          id: 'sub1',
          userId: 'student-id',
          score: 8,
          totalQuestions: 10,
          quiz: {
            id: 'quiz1',
            title: 'Quiz 1',
            teacher: { id: 't1', name: 'Teacher 1' },
          },
        },
        {
          id: 'sub2',
          userId: 'student-id',
          score: 7,
          totalQuestions: 10,
          quiz: {
            id: 'quiz2',
            title: 'Quiz 2',
            teacher: { id: 't2', name: 'Teacher 2' },
          },
        },
      ];

      jest
        .spyOn(prisma.submission, 'findMany')
        .mockResolvedValue(submissions as any);
      jest.spyOn(prisma.submission, 'count').mockResolvedValue(2);

      const result = await service.findUserSubmissions('student-id', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should use default pagination if not provided', async () => {
      jest.spyOn(prisma.submission, 'findMany').mockResolvedValue([]);
      jest.spyOn(prisma.submission, 'count').mockResolvedValue(0);

      await service.findUserSubmissions('student-id');

      expect(prisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a submission by id for the user', async () => {
      const submission = {
        id: 'sub-id',
        userId: 'student-id',
        score: 8,
        totalQuestions: 10,
        quiz: {
          id: 'quiz-id',
          title: 'Test Quiz',
          teacher: { id: 't1', name: 'Teacher', email: 't@test.com' },
          questions: [],
        },
        answers: [],
      };

      jest
        .spyOn(prisma.submission, 'findFirst')
        .mockResolvedValue(submission as any);

      const result = await service.findOne('sub-id', 'student-id');

      expect(result).toEqual(submission);
      expect(prisma.submission.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'sub-id',
          userId: 'student-id',
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if submission does not exist', async () => {
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent-id', 'student-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if submission belongs to different user', async () => {
      jest.spyOn(prisma.submission, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne('sub-id', 'other-student')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findQuizSubmissions', () => {
    it('should return submissions for a quiz owned by teacher', async () => {
      const quiz = {
        id: 'quiz-id',
        teacherId: 'teacher-id',
      };

      const submissions = [
        {
          id: 'sub1',
          userId: 'student1',
          score: 8,
          user: { id: 'student1', name: 'Student 1', email: 's1@test.com' },
        },
        {
          id: 'sub2',
          userId: 'student2',
          score: 7,
          user: { id: 'student2', name: 'Student 2', email: 's2@test.com' },
        },
      ];

      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(quiz as any);
      jest
        .spyOn(prisma.submission, 'findMany')
        .mockResolvedValue(submissions as any);

      const result = await service.findQuizSubmissions('quiz-id', 'teacher-id');

      expect(result).toEqual(submissions);
      expect(prisma.quiz.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'quiz-id',
          teacherId: 'teacher-id',
          deletedAt: null,
        },
      });
      expect(prisma.submission.findMany).toHaveBeenCalledWith({
        where: { quizId: 'quiz-id' },
        include: expect.any(Object),
        orderBy: { submittedAt: 'desc' },
      });
    });

    it('should throw NotFoundException if quiz does not exist', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(
        service.findQuizSubmissions('nonexistent-id', 'teacher-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if teacher does not own quiz', async () => {
      jest.spyOn(prisma.quiz, 'findFirst').mockResolvedValue(null);

      await expect(
        service.findQuizSubmissions('quiz-id', 'other-teacher'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
