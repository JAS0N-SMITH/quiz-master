export interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  timeLimit: number;
  published: boolean;
  teacherId: string;
  teacher?: User;
  questions?: Question[];
  questionCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOption?: number; // Only visible after submission
  explanation?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Submission {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  totalQuestions: number;
  startedAt: string;
  submittedAt?: string;
  createdAt?: string;
  quiz?: Quiz;
  answers?: Answer[];
}

export interface Answer {
  id: string;
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  question?: Question;
  createdAt?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
}

export interface LoginDto {
  email: string;
  password: string;
}
