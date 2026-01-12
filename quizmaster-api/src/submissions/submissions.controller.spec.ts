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
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
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
      expect(submissionsService.findOne).toHaveBeenCalledWith(
        'submission-id',
        mockUser.id,
      );
    });
  });
});
