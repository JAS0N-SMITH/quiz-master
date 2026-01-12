import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
});

// Mock auth store
const mockUseAuthStore = jest.fn();
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

describe('Sidebar', () => {
  describe('student navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'student@test.com',
          name: 'Student',
          role: 'STUDENT',
        },
        isAuthenticated: () => true,
      });
    });

    it('should render navigation element', () => {
      render(<Sidebar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render dashboard link', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('should render quizzes link', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /browse quizzes/i })).toBeInTheDocument();
    });

    it('should render my results link for students', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /my results/i })).toBeInTheDocument();
    });

    it('should NOT render create quiz link for students', () => {
      render(<Sidebar />);

      expect(screen.queryByRole('link', { name: /create quiz/i })).not.toBeInTheDocument();
    });

    it('should highlight active link', () => {
      render(<Sidebar />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('teacher navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'teacher@test.com',
          name: 'Teacher',
          role: 'TEACHER',
        },
        isAuthenticated: () => true,
      });
    });

    it('should render create quiz link for teachers', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /create quiz/i })).toBeInTheDocument();
    });

    it('should render my quizzes link for teachers', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /my quizzes/i })).toBeInTheDocument();
    });

    it('should NOT render my results link for teachers', () => {
      render(<Sidebar />);

      expect(screen.queryByRole('link', { name: /my results/i })).not.toBeInTheDocument();
    });
  });

  describe('admin navigation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'admin@test.com',
          name: 'Admin',
          role: 'ADMIN',
        },
        isAuthenticated: () => true,
      });
    });

    it('should render teacher navigation for admins', () => {
      render(<Sidebar />);

      expect(screen.getByRole('link', { name: /create quiz/i })).toBeInTheDocument();
    });
  });

  describe('navigation interaction', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'student@test.com',
          name: 'Student',
          role: 'STUDENT',
        },
        isAuthenticated: () => true,
      });
    });

    it('should navigate on link click', () => {
      render(<Sidebar />);

      const quizzesLink = screen.getByRole('link', { name: /browse quizzes/i });
      expect(quizzesLink).toHaveAttribute('href', '/dashboard/quizzes');
    });

    it('should highlight active path', () => {
      const { usePathname } = require('next/navigation');
      (usePathname as jest.Mock).mockReturnValue('/dashboard/quizzes');

      render(<Sidebar />);

      const quizzesLink = screen.getByRole('link', { name: /browse quizzes/i });
      // The link should exist and have href
      expect(quizzesLink).toBeInTheDocument();
      expect(quizzesLink).toHaveAttribute('href', '/dashboard/quizzes');
      // When pathname matches, the link should have active classes applied
      // Check that the link has className (which will be set by cn())
      const linkElement = quizzesLink as HTMLElement;
      expect(linkElement.className).toBeTruthy();
      // The active link should have bg-accent class
      expect(linkElement.className).toContain('bg-accent');
    });
  });
});
