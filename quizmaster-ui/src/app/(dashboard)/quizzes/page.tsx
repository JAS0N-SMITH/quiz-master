'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { QuizCard } from '@/components/quiz/QuizCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import type { Quiz } from '@/types';

interface QuizzesResponse {
  data: Quiz[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function QuizzesPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const { data, isLoading, error } = useQuery<QuizzesResponse>({
    queryKey: ['quizzes', isTeacher ? user?.id : 'published'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (isTeacher && user?.id) {
        params.append('teacherId', user.id);
      } else {
        params.append('published', 'true');
      }
      return apiClient.get<QuizzesResponse>(`/quizzes?${params.toString()}`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          {isTeacher && (
            <Skeleton className="h-10 w-32" />
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'Manage your quizzes and view student performance.'
              : 'Browse available quizzes and track your progress.'}
          </p>
        </div>
        <Card className="p-6">
          <p className="text-destructive">Failed to load quizzes. Please try again.</p>
        </Card>
      </div>
    );
  }

  const quizzes = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isTeacher ? 'My Quizzes' : 'Available Quizzes'}
          </h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'Manage your quizzes and view student performance.'
              : 'Browse available quizzes and track your progress.'}
          </p>
        </div>
        {isTeacher && (
          <Link href="/dashboard/quizzes/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {isTeacher ? 'No quizzes yet' : 'No quizzes available'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {isTeacher
              ? 'Create your first quiz to get started.'
              : 'Check back later for new quizzes.'}
          </p>
          {isTeacher && (
            <Link href="/dashboard/quizzes/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Quiz
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
        </div>
      )}
    </div>
  );
}
