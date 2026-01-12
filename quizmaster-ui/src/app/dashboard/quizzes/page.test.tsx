import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizzesPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock auth store
const mockUseAuthStore = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// Mock API client
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
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

const mockQuiz = {
  id: 'quiz-1',
  title: 'Test Quiz',
  description: 'Test description',
  timeLimit: 30,
  published: true,
  teacherId: 'teacher-1',
  questionCount: 10,
  createdAt: '2025-01-10T00:00:00.000Z',
};

describe('QuizzesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  describe('student view', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'student-1',
          email: 'student@test.com',
          name: 'Student',
          role: 'STUDENT',
        },
      });
    });

    it('should render student title', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        // May appear multiple times, use getAllByText
        const titles = screen.getAllByText(/available quizzes/i);
        expect(titles.length).toBeGreaterThan(0);
      });
    });

    it('should render quiz cards when quizzes exist', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [mockQuiz],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      });
    });

    it('should show empty state when no quizzes', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/no quizzes available/i),
        ).toBeInTheDocument();
      });
    });

    it('should show loading skeletons while fetching', () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<QuizzesPage />);

      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('teacher view', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'teacher-1',
          email: 'teacher@test.com',
          name: 'Teacher',
          role: 'TEACHER',
        },
      });
    });

    it('should render teacher title', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        // "Quizzes" may appear multiple times, check for heading
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.length).toBeGreaterThan(0);
        expect(headings[0].textContent).toMatch(/quizzes/i);
      });
    });

    it('should render create quiz button for teachers', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /create quiz/i }),
        ).toBeInTheDocument();
      });
    });

    it('should show tabs for my quizzes and all quizzes', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText(/my quizzes/i)).toBeInTheDocument();
        expect(screen.getByText(/all quizzes/i)).toBeInTheDocument();
      });
    });

    it('should show my quizzes in my tab', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValueOnce({
        data: [mockQuiz],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      });
    });

    it('should show empty state for my quizzes', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValueOnce({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText(/no quizzes yet/i)).toBeInTheDocument();
        expect(
          screen.getByRole('link', { name: /create your first quiz/i }),
        ).toBeInTheDocument();
      });
    });

    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      const { apiClient } = require('@/lib/api');
      apiClient.get
        .mockResolvedValueOnce({
          data: [mockQuiz],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        })
        .mockResolvedValueOnce({
          data: [],
          meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Quiz')).toBeInTheDocument();
      });

      const allQuizzesTab = screen.getByText(/all quizzes/i);
      await user.click(allQuizzesTab);

      await waitFor(() => {
        // Should fetch all quizzes
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('published=true'),
        );
      });
    });
  });

  describe('filtering and pagination', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 'student-1',
          email: 'student@test.com',
          name: 'Student',
          role: 'STUDENT',
        },
      });
    });

    it('should fetch published quizzes for students', async () => {
      const { apiClient } = require('@/lib/api');
      apiClient.get.mockResolvedValue({
        data: [mockQuiz],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      renderWithProviders(<QuizzesPage />);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('published=true'),
        );
      });
    });
  });
});
