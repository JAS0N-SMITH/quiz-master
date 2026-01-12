import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth store
const mockUseAuthStore = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// Mock API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('student view', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'student-1',
          email: 'student@test.com',
          name: 'Student User',
          role: 'STUDENT',
        },
      });
    });

    it('should render student welcome message', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back, student user/i)).toBeInTheDocument();
      });
    });

    it('should render student stats cards', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [
          {
            id: 'sub-1',
            score: 8,
            totalQuestions: 10,
            quiz: { title: 'Quiz 1' },
            submittedAt: new Date().toISOString(),
          },
          {
            id: 'sub-2',
            score: 7,
            totalQuestions: 10,
            quiz: { title: 'Quiz 2' },
            submittedAt: new Date().toISOString(),
          },
        ],
        meta: { total: 2, page: 1, limit: 5, totalPages: 1 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/quizzes taken/i)).toBeInTheDocument();
        expect(screen.getByText(/average score/i)).toBeInTheDocument();
        expect(screen.getByText(/best score/i)).toBeInTheDocument();
      });
    });

    it('should show loading skeletons while fetching', () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<DashboardPage />);

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should display empty state when no submissions', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no submissions yet/i),
        ).toBeInTheDocument();
      });
    });

    it('should calculate and display stats correctly', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [
          {
            id: 'sub-1',
            score: 8,
            totalQuestions: 10,
            quiz: { title: 'Quiz 1' },
            submittedAt: new Date().toISOString(),
          },
          {
            id: 'sub-2',
            score: 5,
            totalQuestions: 10,
            quiz: { title: 'Quiz 2' },
            submittedAt: new Date().toISOString(),
          },
        ],
        meta: { total: 2, page: 1, limit: 5, totalPages: 1 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // Check for specific stat labels to verify calculations
        expect(screen.getByText(/quizzes taken/i)).toBeInTheDocument();
        expect(screen.getByText(/average score/i)).toBeInTheDocument();
        expect(screen.getByText(/best score/i)).toBeInTheDocument();
      });

      // Verify stats are displayed (numbers may appear in different places)
      const pageContent = document.body.textContent || '';
      expect(pageContent).toMatch(/2/); // Quizzes taken
      expect(pageContent).toMatch(/65/); // Average score
      expect(pageContent).toMatch(/80/); // Best score
    });
  });

  describe('teacher view', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'teacher-1',
          email: 'teacher@test.com',
          name: 'Teacher User',
          role: 'TEACHER',
        },
      });
    });

    it('should render teacher welcome message', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/welcome back, teacher user/i),
        ).toBeInTheDocument();
      });
    });

    it('should render teacher stats cards', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [
          {
            id: 'quiz-1',
            title: 'Quiz 1',
            published: true,
            questionCount: 10,
          },
          {
            id: 'quiz-2',
            title: 'Quiz 2',
            published: false,
            questionCount: 15,
          },
        ],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/quizzes created/i)).toBeInTheDocument();
        expect(screen.getByText(/total questions/i)).toBeInTheDocument();
        expect(screen.getByText(/published quizzes/i)).toBeInTheDocument();
      });
    });

    it('should calculate teacher stats correctly', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [
          {
            id: 'quiz-1',
            title: 'Quiz 1',
            published: true,
            questionCount: 10,
          },
          {
            id: 'quiz-2',
            title: 'Quiz 2',
            published: true,
            questionCount: 15,
          },
          {
            id: 'quiz-3',
            title: 'Quiz 3',
            published: false,
            questionCount: 20,
          },
        ],
        meta: { total: 3, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        // Check for specific stat labels
        expect(screen.getByText(/quizzes created/i)).toBeInTheDocument();
        expect(screen.getByText(/total questions/i)).toBeInTheDocument();
        expect(screen.getByText(/published quizzes/i)).toBeInTheDocument();
        // Verify "2 published" text appears
        expect(screen.getByText(/2 published/i)).toBeInTheDocument();
      });

      // Verify numbers appear in the rendered content
      const pageContent = document.body.textContent || '';
      expect(pageContent).toMatch(/3/); // Quizzes created
      expect(pageContent).toMatch(/45/); // Total questions
    });

    it('should show quick actions for teachers', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /create new quiz/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('link', { name: /manage quizzes/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('navigation links', () => {
    it('should have working links in student view', async () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'student-1',
          email: 'student@test.com',
          name: 'Student',
          role: 'STUDENT',
        },
      });

      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 5, totalPages: 0 },
      });

      renderWithProviders(<DashboardPage />);

      await waitFor(() => {
        const browseLink = screen.getByRole('link', { name: /browse quizzes/i });
        expect(browseLink).toHaveAttribute('href', '/dashboard/quizzes');
      });
    });
  });
});
