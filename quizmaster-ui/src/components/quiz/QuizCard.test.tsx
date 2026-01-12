import { render, screen } from '@testing-library/react';
import { QuizCard } from './QuizCard';
import type { Quiz } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth store
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'student-id',
      email: 'student@test.com',
      name: 'Student',
      role: 'STUDENT',
    },
  }),
}));

describe('QuizCard', () => {
  const mockQuiz: Quiz = {
    id: 'quiz-1',
    title: 'JavaScript Fundamentals',
    description: 'Test your JavaScript knowledge',
    timeLimit: 30,
    published: true,
    teacherId: 'teacher-1',
    questionCount: 10,
    createdAt: '2025-01-10T00:00:00.000Z',
  };

  it('should render quiz title', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText('JavaScript Fundamentals')).toBeInTheDocument();
  });

  it('should render quiz description', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText('Test your JavaScript knowledge')).toBeInTheDocument();
  });

  it('should render time limit', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText(/30/)).toBeInTheDocument();
  });

  it('should render question count', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('should render take quiz button for published quizzes', () => {
    render(<QuizCard quiz={mockQuiz} />);

    expect(
      screen.getByRole('link', { name: /take quiz/i }),
    ).toBeInTheDocument();
  });

  it('should render draft badge for unpublished quizzes', () => {
    const draftQuiz = { ...mockQuiz, published: false };
    render(<QuizCard quiz={draftQuiz} />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should show not available for unpublished quizzes', () => {
    const draftQuiz = { ...mockQuiz, published: false };
    render(<QuizCard quiz={draftQuiz} />);

    expect(screen.getByText('Not Available')).toBeInTheDocument();
  });
});
