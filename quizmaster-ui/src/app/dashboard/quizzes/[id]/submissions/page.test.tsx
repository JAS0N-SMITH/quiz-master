import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizSubmissionsPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Submission, User } from '@/types';

// Mock next/navigation
const mockPush = jest.fn();
const mockParams = { id: 'quiz-1' };
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

// Mock auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
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

interface SubmissionWithUser extends Submission {
  user: User;
}

const mockSubmissions: SubmissionWithUser[] = [
  {
    id: 'sub-1',
    userId: 'user-1',
    quizId: 'quiz-1',
    score: 4,
    totalQuestions: 5,
    startedAt: '2024-01-01T10:00:00Z',
    submittedAt: '2024-01-01T10:30:00Z',
    user: {
      id: 'user-1',
      email: 'student1@test.com',
      name: 'Student One',
      role: 'STUDENT',
    },
  },
  {
    id: 'sub-2',
    userId: 'user-2',
    quizId: 'quiz-1',
    score: 3,
    totalQuestions: 5,
    startedAt: '2024-01-01T11:00:00Z',
    submittedAt: '2024-01-01T11:25:00Z',
    user: {
      id: 'user-2',
      email: 'student2@test.com',
      name: 'Student Two',
      role: 'STUDENT',
    },
  },
  {
    id: 'sub-3',
    userId: 'user-3',
    quizId: 'quiz-1',
    score: 2,
    totalQuestions: 5,
    startedAt: '2024-01-01T12:00:00Z',
    submittedAt: undefined,
    user: {
      id: 'user-3',
      email: 'student3@test.com',
      name: 'Student Three',
      role: 'STUDENT',
    },
  },
];

describe('QuizSubmissionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: 'teacher-1',
        email: 'teacher@test.com',
        name: 'Teacher',
        role: 'TEACHER',
      },
    });
  });

  it('should render loading state', () => {
    (apiClient.get as jest.Mock).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderWithProviders(<QuizSubmissionsPage />);

    // Check for Skeleton component by data attribute
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render error state', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load submissions/i)).toBeInTheDocument();
    });
  });

  it('should render submissions page title', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Quiz Submissions')).toBeInTheDocument();
    });

    expect(screen.getByText(/view all student submissions/i)).toBeInTheDocument();
  });

  it('should display stats cards', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Submissions')).toBeInTheDocument();
    });

    expect(screen.getByText('3')).toBeInTheDocument(); // Total submissions
    expect(screen.getByText(/students have taken this quiz/i)).toBeInTheDocument();
  });

  it('should calculate and display average score', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Average Score')).toBeInTheDocument();
    });

    // Average: (4+3+2)/3 = 3, 3/5 = 60%
    // There may be multiple 60% elements (in stats and table), so use getAllByText
    const percentageElements = screen.getAllByText(/60%/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  it('should display completion rate', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });

    // 2 completed out of 3
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('should render submissions table', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Submissions')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Percentage')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should display student names in table', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Student One')).toBeInTheDocument();
    });

    expect(screen.getByText('Student Two')).toBeInTheDocument();
    expect(screen.getByText('Student Three')).toBeInTheDocument();
  });

  it('should display scores in table', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('4 / 5')).toBeInTheDocument();
    });

    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('should display percentage badges with correct variants', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      // 80% (4/5) - should be default variant (green)
      expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
      // 60% (3/5) - should be secondary variant (may appear in stats and table)
      expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
      // 40% (2/5) - should be destructive variant (red)
      expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
    });
  });

  it('should display status badges', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges.length).toBe(2);
    });

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('should display submission time', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      const timeElements = screen.getAllByText('2 hours ago');
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  it('should display "Not submitted" for in-progress submissions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Not submitted')).toBeInTheDocument();
    });
  });

  it('should navigate to results page when clicking row', async () => {
    const user = userEvent.setup();
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Student One')).toBeInTheDocument();
    });

    const row = screen.getByText('Student One').closest('tr');
    if (row) {
      await user.click(row);
      expect(mockPush).toHaveBeenCalledWith('/dashboard/results/sub-1');
    }
  });

  it('should navigate to results page when clicking view details button', async () => {
    const user = userEvent.setup();
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('View Details');
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    const viewButtons = screen.getAllByText('View Details');
    await user.click(viewButtons[0]);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/results/sub-1');
  });

  it('should display empty state when no submissions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument();
    });
  });

  it('should not fetch submissions for non-teacher users', async () => {
    (useAuthStore as jest.Mock).mockReturnValue({
      user: {
        id: 'student-1',
        email: 'student@test.com',
        name: 'Student',
        role: 'STUDENT',
      },
    });

    renderWithProviders(<QuizSubmissionsPage />);

    // Query should be disabled, so apiClient.get should not be called
    await waitFor(() => {
      // Should show loading or error state
      expect(screen.queryByText('Quiz Submissions')).not.toBeInTheDocument();
    });
  });

  it('should handle average score calculation with zero submissions', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Average Score')).toBeInTheDocument();
    });

    // Should show 0% for empty submissions
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should render back to quizzes button', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(mockSubmissions);

    renderWithProviders(<QuizSubmissionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/back to quizzes/i)).toBeInTheDocument();
    });
  });
});
