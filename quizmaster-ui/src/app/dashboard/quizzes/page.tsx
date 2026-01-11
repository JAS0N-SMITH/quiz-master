'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { QuizCard } from '@/components/quiz/QuizCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import type { Quiz } from '@/types';
import { toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const queryClient = useQueryClient();

  // My Quizzes query (for teachers)
  const { data: myQuizzes, isLoading: isLoadingMy } = useQuery<QuizzesResponse>({
    queryKey: ['quizzes', 'my', user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        params.append('teacherId', user.id);
      }
      return apiClient.get<QuizzesResponse>(`/quizzes?${params.toString()}`);
    },
    enabled: isTeacher && activeTab === 'my',
  });

  // All Published Quizzes query
  const { data: allQuizzes, isLoading: isLoadingAll } = useQuery<QuizzesResponse>({
    queryKey: ['quizzes', 'all', 'published'],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('published', 'true');
      return apiClient.get<QuizzesResponse>(`/quizzes?${params.toString()}`);
    },
    enabled: isTeacher ? activeTab === 'all' : true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (quizId: string) => {
      return apiClient.delete(`/quizzes/${quizId}`);
    },
    onSuccess: () => {
      toast.success('Quiz deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete quiz');
    },
  });

  const handleDelete = (quizId: string) => {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      deleteMutation.mutate(quizId);
    }
  };

  const isLoading = isTeacher
    ? activeTab === 'my'
      ? isLoadingMy
      : isLoadingAll
    : isLoadingAll;

  const quizzes = isTeacher
    ? activeTab === 'my'
      ? myQuizzes?.data || []
      : allQuizzes?.data || []
    : allQuizzes?.data || [];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isTeacher ? 'Quizzes' : 'Available Quizzes'}
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

      {isTeacher ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'my' | 'all')}>
          <TabsList>
            <TabsTrigger value="my">My Quizzes</TabsTrigger>
            <TabsTrigger value="all">All Quizzes</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-6">
            {myQuizzes?.data.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first quiz to get started.
                </p>
                <Link href="/dashboard/quizzes/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Quiz
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {myQuizzes?.data.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onDelete={handleDelete}
                    showDelete
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {allQuizzes?.data.length === 0 ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No quizzes available</h3>
                <p className="text-muted-foreground">
                  Check back later for new quizzes.
                </p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allQuizzes?.data.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {quizzes.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No quizzes available</h3>
              <p className="text-muted-foreground">
                Check back later for new quizzes.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <QuizCard key={quiz.id} quiz={quiz} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
