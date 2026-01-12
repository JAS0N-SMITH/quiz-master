# QuizMaster Testing Fixes - Part 3 (Additional Frontend Coverage)

## Overview

This document contains additional frontend tests for remaining uncovered components to push coverage toward 70%.

**Components Covered:**
1. Header component
2. Sidebar component
3. Quiz detail page
4. Loading skeletons
5. Error boundary
6. Utility functions
7. Additional UI component tests

---

## Priority 1: Header Component Tests

**Create File:** `quizmaster-ui/src/components/layout/Header.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from './Header';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth store
const mockLogout = jest.fn();
const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'STUDENT' as const,
};

jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    isAuthenticated: true,
    logout: mockLogout,
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render header element', () => {
      render(<Header />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render logo or brand name', () => {
      render(<Header />);

      expect(screen.getByText(/quizmaster/i)).toBeInTheDocument();
    });

    it('should render user name', () => {
      render(<Header />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render user avatar or initials', () => {
      render(<Header />);

      // Either an avatar image or initials
      const avatar = screen.queryByRole('img') || screen.queryByText(/TU|T/);
      expect(avatar).toBeInTheDocument();
    });

    it('should render logout button', () => {
      render(<Header />);

      expect(screen.getByRole('button', { name: /logout|sign out/i })).toBeInTheDocument();
    });
  });

  describe('user menu', () => {
    it('should open user menu on click', async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Find avatar/menu trigger
      const menuTrigger = screen.getByRole('button', { name: /user menu|profile|Test User/i });
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });
    });

    it('should show profile option in menu', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const menuTrigger = screen.getByRole('button', { name: /user menu|profile|Test User/i });
      await user.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/profile|settings/i)).toBeInTheDocument();
      });
    });
  });

  describe('logout', () => {
    it('should call logout on button click', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout|sign out/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should redirect to login after logout', async () => {
      const user = userEvent.setup();
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout|sign out/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('role display', () => {
    it('should display user role badge', () => {
      render(<Header />);

      expect(screen.getByText(/student/i)).toBeInTheDocument();
    });
  });

  describe('mobile menu', () => {
    it('should render mobile menu toggle on small screens', () => {
      // Set viewport to mobile
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));

      render(<Header />);

      expect(screen.getByRole('button', { name: /menu|toggle/i })).toBeInTheDocument();
    });
  });
});

describe('Header - Teacher View', () => {
  beforeEach(() => {
    jest.doMock('@/store/authStore', () => ({
      useAuthStore: () => ({
        user: { ...mockUser, role: 'TEACHER', name: 'Teacher User' },
        isAuthenticated: true,
        logout: mockLogout,
      }),
    }));
  });

  it('should display teacher role', () => {
    render(<Header />);

    expect(screen.getByText(/teacher/i)).toBeInTheDocument();
  });
});
```

---

## Priority 2: Sidebar Component Tests

**Create File:** `quizmaster-ui/src/components/layout/Sidebar.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from './Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
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

describe('Sidebar', () => {
  describe('student navigation', () => {
    beforeEach(() => {
      jest.doMock('@/store/authStore', () => ({
        useAuthStore: () => ({
          user: { id: '1', email: 'student@test.com', name: 'Student', role: 'STUDENT' },
          isAuthenticated: true,
        }),
      }));
    });

    it('should render navigation element', () => {
      render(<Sidebar userRole="STUDENT" />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render dashboard link', () => {
      render(<Sidebar userRole="STUDENT" />);

      expect(screen.getByRole('link', { name: /dashboard|home/i })).toBeInTheDocument();
    });

    it('should render quizzes link', () => {
      render(<Sidebar userRole="STUDENT" />);

      expect(screen.getByRole('link', { name: /quizzes|browse/i })).toBeInTheDocument();
    });

    it('should render my results link for students', () => {
      render(<Sidebar userRole="STUDENT" />);

      expect(screen.getByRole('link', { name: /results|history|submissions/i })).toBeInTheDocument();
    });

    it('should NOT render create quiz link for students', () => {
      render(<Sidebar userRole="STUDENT" />);

      expect(screen.queryByRole('link', { name: /create quiz/i })).not.toBeInTheDocument();
    });

    it('should highlight active link', () => {
      render(<Sidebar userRole="STUDENT" />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard|home/i });
      expect(dashboardLink).toHaveClass(/active|bg-primary|selected/i);
    });
  });

  describe('teacher navigation', () => {
    it('should render create quiz link for teachers', () => {
      render(<Sidebar userRole="TEACHER" />);

      expect(screen.getByRole('link', { name: /create quiz/i })).toBeInTheDocument();
    });

    it('should render my quizzes link for teachers', () => {
      render(<Sidebar userRole="TEACHER" />);

      expect(screen.getByRole('link', { name: /my quizzes/i })).toBeInTheDocument();
    });

    it('should render analytics link for teachers', () => {
      render(<Sidebar userRole="TEACHER" />);

      expect(screen.getByRole('link', { name: /analytics|stats/i })).toBeInTheDocument();
    });
  });

  describe('admin navigation', () => {
    it('should render admin links for admins', () => {
      render(<Sidebar userRole="ADMIN" />);

      expect(screen.getByRole('link', { name: /users|manage/i })).toBeInTheDocument();
    });
  });

  describe('collapsible behavior', () => {
    it('should toggle collapse on button click', async () => {
      const user = userEvent.setup();
      render(<Sidebar userRole="STUDENT" />);

      const collapseButton = screen.getByRole('button', { name: /collapse|toggle|menu/i });
      await user.click(collapseButton);

      // Sidebar should be collapsed (narrow)
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass(/collapsed|w-16|narrow/i);
    });

    it('should show only icons when collapsed', async () => {
      const user = userEvent.setup();
      render(<Sidebar userRole="STUDENT" />);

      const collapseButton = screen.getByRole('button', { name: /collapse|toggle/i });
      await user.click(collapseButton);

      // Text should be hidden
      expect(screen.queryByText(/Dashboard/i)).not.toBeVisible();
    });
  });

  describe('navigation interaction', () => {
    it('should navigate on link click', async () => {
      const user = userEvent.setup();
      render(<Sidebar userRole="STUDENT" />);

      const quizzesLink = screen.getByRole('link', { name: /quizzes/i });
      expect(quizzesLink).toHaveAttribute('href', expect.stringContaining('/quizzes'));
    });
  });
});
```

---

## Priority 3: Quiz Detail Page Tests

**Create File:** `quizmaster-ui/src/app/dashboard/quizzes/[id]/page.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizDetailPage from './page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => ({
    id: 'quiz-1',
  }),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', email: 'test@test.com', name: 'Test', role: 'STUDENT' },
    isAuthenticated: true,
  }),
}));

import { apiClient } from '@/lib/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

const mockQuiz = {
  id: 'quiz-1',
  title: 'JavaScript Fundamentals',
  description: 'Test your JavaScript knowledge with this comprehensive quiz.',
  timeLimit: 30,
  published: true,
  teacherId: 'teacher-1',
  teacher: {
    id: 'teacher-1',
    name: 'John Teacher',
  },
  questionCount: 10,
  createdAt: '2025-01-10T00:00:00.000Z',
  questions: [
    { id: 'q1', text: 'What is JavaScript?', options: ['A', 'B', 'C', 'D'], order: 1 },
    { id: 'q2', text: 'What is a closure?', options: ['A', 'B', 'C', 'D'], order: 2 },
  ],
};

describe('QuizDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockResolvedValue(mockQuiz);
  });

  describe('rendering', () => {
    it('should render quiz title', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
      });
    });

    it('should render quiz description', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Test your JavaScript knowledge/)).toBeInTheDocument();
      });
    });

    it('should display time limit', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/30.*min|30 minutes/i)).toBeInTheDocument();
      });
    });

    it('should display question count', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/10.*questions/i)).toBeInTheDocument();
      });
    });

    it('should display teacher name', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/John Teacher/i)).toBeInTheDocument();
      });
    });

    it('should render take quiz button for students', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /take quiz|start quiz/i })).toBeInTheDocument();
      });
    });

    it('should render back button', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back/i })).toBeInTheDocument();
      });
    });
  });

  describe('quiz info cards', () => {
    it('should display time limit card', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/time limit/i)).toBeInTheDocument();
      });
    });

    it('should display questions card', async () => {
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/questions/i)).toBeInTheDocument();
      });
    });
  });

  describe('take quiz action', () => {
    it('should navigate to take quiz page on button click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /take quiz|start/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /take quiz|start/i }));

      expect(mockPush).toHaveBeenCalledWith('/dashboard/quizzes/quiz-1/take');
    });
  });

  describe('loading state', () => {
    it('should show loading while fetching', () => {
      (apiClient.get as jest.Mock).mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<QuizDetailPage />);

      expect(document.querySelectorAll('[class*="skeleton"]').length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('should show error on fetch failure', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Quiz not found'));

      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/error|not found|failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('unpublished quiz', () => {
    it('should show unpublished badge for unpublished quiz', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        ...mockQuiz,
        published: false,
      });

      renderWithProviders(<QuizDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/draft|unpublished/i)).toBeInTheDocument();
      });
    });
  });
});

describe('QuizDetailPage - Teacher View', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.doMock('@/store/authStore', () => ({
      useAuthStore: () => ({
        user: { id: 'teacher-1', email: 'teacher@test.com', name: 'Teacher', role: 'TEACHER' },
        isAuthenticated: true,
      }),
    }));

    (apiClient.get as jest.Mock).mockResolvedValue(mockQuiz);
  });

  it('should show edit button for quiz owner', async () => {
    renderWithProviders(<QuizDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });
  });

  it('should show delete button for quiz owner', async () => {
    renderWithProviders(<QuizDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });
  });

  it('should show view submissions button', async () => {
    renderWithProviders(<QuizDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /submissions|view results/i })).toBeInTheDocument();
    });
  });

  it('should navigate to edit page on edit click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/quizzes/quiz-1/edit');
  });
});
```

---

## Priority 4: Loading Skeletons Tests

**Create File:** `quizmaster-ui/src/components/ui/loading-skeletons.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import {
  StatsCardSkeleton,
  QuizCardSkeleton,
  TableRowSkeleton,
  QuestionSkeleton,
} from './loading-skeletons';

describe('Loading Skeletons', () => {
  describe('StatsCardSkeleton', () => {
    it('should render skeleton card', () => {
      render(<StatsCardSkeleton />);

      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have card structure', () => {
      const { container } = render(<StatsCardSkeleton />);

      expect(container.querySelector('[class*="card"]')).toBeInTheDocument();
    });
  });

  describe('QuizCardSkeleton', () => {
    it('should render skeleton for quiz card', () => {
      render(<QuizCardSkeleton />);

      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have title skeleton', () => {
      const { container } = render(<QuizCardSkeleton />);

      // Should have a wider skeleton for title
      const titleSkeleton = container.querySelector('[class*="skeleton"][class*="h-6"], [class*="skeleton"][class*="h-8"]');
      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should have description skeleton', () => {
      const { container } = render(<QuizCardSkeleton />);

      // Should have multiple line skeletons for description
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('TableRowSkeleton', () => {
    it('should render table row skeleton', () => {
      render(
        <table>
          <tbody>
            <TableRowSkeleton columns={4} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('row');
      expect(row).toBeInTheDocument();
    });

    it('should render correct number of columns', () => {
      render(
        <table>
          <tbody>
            <TableRowSkeleton columns={5} />
          </tbody>
        </table>
      );

      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(5);
    });

    it('should have skeleton in each cell', () => {
      render(
        <table>
          <tbody>
            <TableRowSkeleton columns={3} />
          </tbody>
        </table>
      );

      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('QuestionSkeleton', () => {
    it('should render question skeleton', () => {
      render(<QuestionSkeleton />);

      const skeletons = document.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have skeleton for question text', () => {
      const { container } = render(<QuestionSkeleton />);

      // Question text skeleton should be prominent
      expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
    });

    it('should have skeletons for options', () => {
      const { container } = render(<QuestionSkeleton />);

      // Should have 4 option skeletons
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(4);
    });
  });
});

describe('Multiple Skeletons', () => {
  it('should render multiple quiz card skeletons', () => {
    render(
      <div>
        {[1, 2, 3].map((i) => (
          <QuizCardSkeleton key={i} />
        ))}
      </div>
    );

    const cards = document.querySelectorAll('[class*="card"]');
    expect(cards.length).toBe(3);
  });

  it('should render multiple table row skeletons', () => {
    render(
      <table>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRowSkeleton key={i} columns={4} />
          ))}
        </tbody>
      </table>
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(5);
  });
});
```

---

## Priority 5: Utility Functions Tests

**Create File:** `quizmaster-ui/src/lib/utils.test.ts`

```typescript
import { cn, formatDate, formatTime, calculatePercentage, truncateText } from './utils';

describe('cn (classnames utility)', () => {
  it('should merge class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toContain('base');
    expect(result).toContain('included');
    expect(result).not.toContain('excluded');
  });

  it('should handle undefined and null', () => {
    const result = cn('base', undefined, null, 'valid');
    expect(result).toBe('base valid');
  });

  it('should handle empty strings', () => {
    const result = cn('base', '', 'valid');
    expect(result).toBe('base valid');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    // Later class should override earlier conflicting class
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('should handle array of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toContain('class1');
    expect(result).toContain('class2');
    expect(result).toContain('class3');
  });
});

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2025-01-10T00:00:00.000Z');
    expect(result).toMatch(/Jan|January/);
    expect(result).toMatch(/10/);
    expect(result).toMatch(/2025/);
  });

  it('should format Date object', () => {
    const date = new Date('2025-06-15');
    const result = formatDate(date);
    expect(result).toMatch(/Jun|June/);
    expect(result).toMatch(/15/);
  });

  it('should handle invalid date', () => {
    const result = formatDate('invalid');
    expect(result).toBe('Invalid Date');
  });
});

describe('formatTime', () => {
  it('should format minutes to MM:SS', () => {
    const result = formatTime(30);
    expect(result).toBe('30:00');
  });

  it('should format seconds correctly', () => {
    const result = formatTime(1.5); // 1.5 minutes = 1:30
    expect(result).toBe('01:30');
  });

  it('should handle zero', () => {
    const result = formatTime(0);
    expect(result).toBe('00:00');
  });

  it('should handle large values', () => {
    const result = formatTime(120);
    expect(result).toBe('120:00');
  });

  it('should pad single digits', () => {
    const result = formatTime(5);
    expect(result).toBe('05:00');
  });
});

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    const result = calculatePercentage(8, 10);
    expect(result).toBe(80);
  });

  it('should handle perfect score', () => {
    const result = calculatePercentage(10, 10);
    expect(result).toBe(100);
  });

  it('should handle zero score', () => {
    const result = calculatePercentage(0, 10);
    expect(result).toBe(0);
  });

  it('should handle zero total', () => {
    const result = calculatePercentage(5, 0);
    expect(result).toBe(0);
  });

  it('should round to nearest integer', () => {
    const result = calculatePercentage(1, 3);
    expect(result).toBe(33); // 33.33... rounded
  });

  it('should handle decimal inputs', () => {
    const result = calculatePercentage(7.5, 10);
    expect(result).toBe(75);
  });
});

describe('truncateText', () => {
  it('should truncate long text', () => {
    const longText = 'This is a very long text that should be truncated';
    const result = truncateText(longText, 20);
    expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    expect(result).toEndWith('...');
  });

  it('should not truncate short text', () => {
    const shortText = 'Short';
    const result = truncateText(shortText, 20);
    expect(result).toBe('Short');
  });

  it('should handle exact length', () => {
    const text = '12345678901234567890';
    const result = truncateText(text, 20);
    expect(result).toBe(text);
  });

  it('should handle empty string', () => {
    const result = truncateText('', 20);
    expect(result).toBe('');
  });

  it('should use custom ellipsis', () => {
    const longText = 'This is a very long text';
    const result = truncateText(longText, 10, '…');
    expect(result).toEndWith('…');
  });
});
```

**Note:** Adjust the function names based on what's actually exported from your utils.ts file.

---

## Priority 6: Form Components Tests

**Create File:** `quizmaster-ui/src/components/quiz/QuestionForm.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionForm from './QuestionForm';
import { useForm, FormProvider } from 'react-hook-form';

// Wrapper component to provide form context
const FormWrapper = ({ children, defaultValues }: { children: React.ReactNode; defaultValues?: any }) => {
  const methods = useForm({
    defaultValues: defaultValues || {
      questions: [{
        text: '',
        options: ['', '', '', ''],
        correctOption: 0,
        explanation: '',
      }],
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('QuestionForm', () => {
  const defaultProps = {
    index: 0,
    onRemove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render question number', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      expect(screen.getByText(/question 1/i)).toBeInTheDocument();
    });

    it('should render question text input', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      expect(screen.getByLabelText(/question text/i)).toBeInTheDocument();
    });

    it('should render 4 option inputs', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      expect(optionInputs).toHaveLength(4);
    });

    it('should render correct answer selector', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      expect(screen.getByText(/correct answer/i)).toBeInTheDocument();
    });

    it('should render explanation input', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      expect(screen.getByLabelText(/explanation/i)).toBeInTheDocument();
    });

    it('should render remove button', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      expect(screen.getByRole('button', { name: /remove|delete/i })).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should allow typing question text', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      const questionInput = screen.getByLabelText(/question text/i);
      await user.type(questionInput, 'What is JavaScript?');

      expect(questionInput).toHaveValue('What is JavaScript?');
    });

    it('should allow typing options', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      const optionInputs = screen.getAllByPlaceholderText(/option/i);
      await user.type(optionInputs[0], 'Option A');
      await user.type(optionInputs[1], 'Option B');

      expect(optionInputs[0]).toHaveValue('Option A');
      expect(optionInputs[1]).toHaveValue('Option B');
    });

    it('should allow selecting correct answer', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      const radioButtons = screen.getAllByRole('radio');
      await user.click(radioButtons[2]); // Select option C

      expect(radioButtons[2]).toBeChecked();
    });

    it('should call onRemove when remove button clicked', async () => {
      const user = userEvent.setup();
      const onRemove = jest.fn();
      
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} onRemove={onRemove} />
        </FormWrapper>
      );

      await user.click(screen.getByRole('button', { name: /remove|delete/i }));

      expect(onRemove).toHaveBeenCalledWith(0);
    });
  });

  describe('validation feedback', () => {
    it('should show error for empty question text', async () => {
      const user = userEvent.setup();
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} />
        </FormWrapper>
      );

      const questionInput = screen.getByLabelText(/question text/i);
      await user.click(questionInput);
      await user.tab(); // Blur

      await waitFor(() => {
        expect(screen.getByText(/question.*required|enter.*question/i)).toBeInTheDocument();
      });
    });
  });

  describe('different indices', () => {
    it('should show correct question number for index 2', () => {
      render(
        <FormWrapper>
          <QuestionForm {...defaultProps} index={2} />
        </FormWrapper>
      );

      expect(screen.getByText(/question 3/i)).toBeInTheDocument();
    });
  });
});
```

---

## Priority 7: Button and Input Component Tests

**Create File:** `quizmaster-ui/src/components/ui/button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not trigger click when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/bg-primary/);
    });

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/bg-destructive|bg-red/);
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/border/);
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/hover:bg-accent/);
    });

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/underline/);
    });
  });

  describe('sizes', () => {
    it('should apply default size', () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/h-10|h-9/);
    });

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/h-8|h-9/);
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/h-11|h-12/);
    });

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass(/h-10.*w-10|h-9.*w-9/);
    });
  });

  describe('as child', () => {
    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      );

      expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner when loading', () => {
      render(<Button loading>Loading</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Loading</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
```

---

## Implementation Checklist

### Part 3 Tests
- [ ] Create `Header.test.tsx`
- [ ] Create `Sidebar.test.tsx`
- [ ] Create `quizzes/[id]/page.test.tsx`
- [ ] Create `loading-skeletons.test.tsx`
- [ ] Create `utils.test.ts`
- [ ] Create `QuestionForm.test.tsx`
- [ ] Create `button.test.tsx`

---

## Running All Tests

```bash
cd quizmaster-ui

# Run all tests with coverage
npm run test:coverage

# Run only new tests
npm run test -- --testPathPattern="Header|Sidebar|loading-skeletons|utils|QuestionForm|button"

# Run in watch mode
npm run test -- --watch
```

---

## Expected Final Coverage

After implementing Parts 1, 2, and 3:

| Metric | Before | Part 1 | Part 2 | Part 3 (Est) |
|--------|--------|--------|--------|--------------|
| Statements | 7.62% | 20.98% | ~40% | 55-65% |
| Branches | 2.93% | 9.97% | ~25% | 35-45% |
| Functions | 6.39% | 14.15% | ~30% | 45-55% |
| Lines | 7.69% | 21.08% | ~40% | 55-65% |

**Note:** To reach 70%+ coverage, you would need to add tests for:
- All remaining page components
- All remaining UI components
- Edge cases and error paths
- Integration tests

The tests in Parts 1-3 cover the most critical paths and components.

---

## Troubleshooting

### Jest Module Mocking Issues

If `jest.doMock` doesn't work as expected:
```typescript
// Use jest.mock at the top of the file with a factory
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

// Then in beforeEach, set the return value
import { useAuthStore } from '@/store/authStore';
(useAuthStore as jest.Mock).mockReturnValue({
  user: mockUser,
  isAuthenticated: true,
});
```

### Testing Components with Portals

For components using portals (modals, dropdowns):
```typescript
// Add portal container before tests
beforeEach(() => {
  const portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'portal-root');
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  document.body.innerHTML = '';
});
```

### Async State Updates

Always wrap assertions in `waitFor` for async updates:
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected')).toBeInTheDocument();
}, { timeout: 3000 });
```
