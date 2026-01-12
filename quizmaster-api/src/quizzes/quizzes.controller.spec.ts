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

      const result = await controller.findAll(
        undefined,
        undefined,
        undefined,
        1,
        10,
      );

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
            text: 'What is a test question?',
            options: ['A', 'B', 'C', 'D'],
            correctOption: 0,
            order: 1,
          },
        ],
      };

      const createdQuiz = {
        id: 'new-quiz-id',
        ...createDto,
        teacherId: mockUser.id,
      };
      mockQuizzesService.create.mockResolvedValue(createdQuiz);

      const result = await controller.create(createDto, mockUser);

      expect(result).toEqual(createdQuiz);
      expect(quizzesService.create).toHaveBeenCalledWith(
        createDto,
        mockUser.id,
      );
    });
  });

  describe('update', () => {
    it('should update a quiz', async () => {
      const updateDto: UpdateQuizDto = { title: 'Updated Title' };
      const updatedQuiz = { id: 'quiz-id', title: 'Updated Title' };

      mockQuizzesService.update.mockResolvedValue(updatedQuiz);

      const result = await controller.update('quiz-id', updateDto, mockUser);

      expect(result).toEqual(updatedQuiz);
      expect(quizzesService.update).toHaveBeenCalledWith(
        'quiz-id',
        updateDto,
        mockUser.id,
      );
    });
  });

  describe('remove', () => {
    it('should remove a quiz', async () => {
      mockQuizzesService.remove.mockResolvedValue({
        id: 'quiz-id',
        deletedAt: new Date(),
      });

      const result = await controller.remove('quiz-id', mockUser);

      expect(quizzesService.remove).toHaveBeenCalledWith(
        'quiz-id',
        mockUser.id,
      );
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('findQuizSubmissions', () => {
    it('should return submissions for a quiz', async () => {
      const submissions = [{ id: 'sub-1', score: 8 }];
      mockSubmissionsService.findQuizSubmissions.mockResolvedValue(submissions);

      const result = await controller.findQuizSubmissions('quiz-id', mockUser);

      expect(result).toEqual(submissions);
      expect(submissionsService.findQuizSubmissions).toHaveBeenCalledWith(
        'quiz-id',
        mockUser.id,
      );
    });
  });
});
