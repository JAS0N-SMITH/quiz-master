import { render, screen, waitFor } from '@testing-library/react';
import ResultsPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { Submission } from '@/types';

// Mock next/navigation
const mockPush = jest.fn();
const mockParams = { id: 'submission-1' };
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date, options) => '2 hours ago'),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

const mockSubmission: Submission = {
  id: 'submission-1',
  userId: 'user-1',
  quizId: 'quiz-1',
  score: 3,
  totalQuestions: 5,
  startedAt: '2024-01-01T10:00:00Z',
  submittedAt: '2024-01-01T10:30:00Z',
  quiz: {
    id: 'quiz-1',
    title: 'Test Quiz',
    description: 'A test quiz',
    timeLimit: 30,
    published: true,
    teacherId: 'teacher-1',
    questions: [
      {
        id: 'q1',
        text: 'What is 2+2?',
        options: ['3', '4', '5', '6'],
        correctOption: 1,
        explanation: 'Basic math',
        order: 0,
      },
      {
        id: 'q2',
        text: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctOption: 2,
        explanation: 'Paris is the capital',
        order: 1,
      },
      {
        id: 'q3',
        text: 'What is 3*3?',
        options: ['6', '9', '12', '15'],
        correctOption: 1,
        explanation: 'Multiplication',
        order: 2,
      },
      {
        id: 'q4',
        text: 'What is 10-5?',
        options: ['3', '4', '5', '6'],
        correctOption: 2,
        explanation: 'Subtraction',
        order: 3,
      },
      {
        id: 'q5',
        text: 'What is 8/2?',
        options: ['2', '3', '4', '5'],
        correctOption: 2,
        explanation: 'Division',
        order: 4,
      },
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  answers: [
    {
      id: 'a1',
      questionId: 'q1',
      selectedOption: 1,
      isCorrect: true,
    },
    {
      id: 'a2',
      questionId: 'q2',
      selectedOption: 2,
      isCorrect: true,
    },
    {
      id: 'a3',
      questionId: 'q3',
      selectedOption: 0,
      isCorrect: false,
    },
    {
      id: 'a4',
      questionId: 'q4',
      selectedOption: 2,
      isCorrect: true,
    },
    {
      id: 'a5',
      questionId: 'q5',
      selectedOption: 1,
      isCorrect: false,
    },
  ],
};

describe('ResultsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    (apiClient.get as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderWithProviders(<ResultsPage />);

    // Check for Skeleton component by data attribute
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error state', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load results/i)).toBeInTheDocument();
    });
  });

  it('should render results with score', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Quiz Results')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Quiz')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should display time taken', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/minutes/i)).toBeInTheDocument();
    });
  });

  it('should display question review with correct answers', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Question Review')).toBeInTheDocument();
    });

    // Check for question text
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();

    // Check for correct/incorrect badges
    const correctBadges = screen.getAllByText(/correct/i);
    expect(correctBadges.length).toBeGreaterThan(0);
  });

  it('should display selected answers', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Your Answer:').length).toBeGreaterThan(0);
    });

    // Check that selected options are displayed (may appear multiple times)
    const fourElements = screen.getAllByText('4');
    expect(fourElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Paris')).toBeInTheDocument(); // Correct answer for q2
  });

  it('should display correct answer for incorrect questions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Correct Answer:').length).toBeGreaterThan(0);
    });

    // For q3, user selected '6' (wrong), correct is '9'
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('should display explanations when available', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Explanation:').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Basic math')).toBeInTheDocument();
    expect(screen.getByText('Paris is the capital')).toBeInTheDocument();
  });

  it('should render back to quizzes button', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      const backButtons = screen.getAllByText(/back to quizzes/i);
      expect(backButtons.length).toBeGreaterThan(0);
    });
  });

  it('should render retake quiz button', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmission);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText(/retake quiz/i)).toBeInTheDocument();
    });
  });

  it('should handle submission without submittedAt', async () => {
    const submissionWithoutTime = {
      ...mockSubmission,
      submittedAt: undefined,
    };
    (apiClient.get as jest.Mock).mockResolvedValue(submissionWithoutTime);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Quiz Results')).toBeInTheDocument();
    });

    // Should still display score
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('should handle submission with no answers', async () => {
    const submissionNoAnswers = {
      ...mockSubmission,
      answers: [],
    };
    (apiClient.get as jest.Mock).mockResolvedValue(submissionNoAnswers);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('Quiz Results')).toBeInTheDocument();
    });

    // Should still render questions
    expect(screen.getByText('Question Review')).toBeInTheDocument();
  });

  it('should calculate percentage correctly', async () => {
    const perfectScore = {
      ...mockSubmission,
      score: 5,
      totalQuestions: 5,
    };
    (apiClient.get as jest.Mock).mockResolvedValue(perfectScore);

    renderWithProviders(<ResultsPage />);

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});
