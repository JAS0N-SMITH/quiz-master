'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCardSkeleton } from '@/components/ui/loading-skeletons';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  TrendingUp,
  Award,
  FileText,
  Users,
  BarChart3,
} from 'lucide-react';
import type { Submission, Quiz } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface SubmissionsResponse {
  data: Submission[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface QuizzesResponse {
  data: Quiz[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  // Fetch student submissions
  const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery<SubmissionsResponse>({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      return apiClient.get<SubmissionsResponse>('/submissions/my-submissions?limit=5');
    },
    enabled: !isTeacher,
  });

  // Fetch teacher quizzes
  const { data: quizzesData, isLoading: isLoadingQuizzes } = useQuery<QuizzesResponse>({
    queryKey: ['my-quizzes', user?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.id) {
        params.append('teacherId', user.id);
      }
      return apiClient.get<QuizzesResponse>(`/quizzes?${params.toString()}`);
    },
    enabled: isTeacher && !!user?.id,
  });

  // Calculate student stats
  const submissions = submissionsData?.data || [];
  const quizzesTaken = submissions.length;
  const averageScore =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, s) => {
            const percentage = (s.score / s.totalQuestions) * 100;
            return sum + percentage;
          }, 0) / submissions.length
        )
      : 0;
  const bestScore =
    submissions.length > 0
      ? Math.max(
          ...submissions.map((s) => Math.round((s.score / s.totalQuestions) * 100))
        )
      : 0;

  // Calculate teacher stats
  const quizzes = quizzesData?.data || [];
  const quizzesCreated = quizzes.length;
  const publishedQuizzes = quizzes.filter((q) => q.published).length;

  if (isTeacher) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">
            Manage your quizzes and view student performance.
          </p>
        </div>

        {isLoadingQuizzes ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quizzes Created</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizzesCreated}</div>
                <p className="text-xs text-muted-foreground">
                  {publishedQuizzes} published
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quizzes.reduce((sum, q) => sum + (q.questionCount || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">across all quizzes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published Quizzes</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{publishedQuizzes}</div>
                <p className="text-xs text-muted-foreground">
                  {quizzesCreated - publishedQuizzes} drafts
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/quizzes/create" className="block">
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Quiz
                </Button>
              </Link>
              <Link href="/dashboard/quizzes" className="block">
                <Button variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Quizzes
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your most recent quizzes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingQuizzes ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No quizzes yet. Create your first quiz to get started!
                </p>
              ) : (
                <div className="space-y-2">
                  {quizzes.slice(0, 3).map((quiz) => (
                    <Link
                      key={quiz.id}
                      href={`/dashboard/quizzes/${quiz.id}`}
                      className="block p-2 rounded hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{quiz.title}</span>
                        <Badge variant={quiz.published ? 'default' : 'secondary'}>
                          {quiz.published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Student Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground">
          Browse available quizzes and track your progress.
        </p>
      </div>

      {isLoadingSubmissions ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizzesTaken}</div>
              <p className="text-xs text-muted-foreground">total attempts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
              <p className="text-xs text-muted-foreground">across all quizzes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bestScore}%</div>
              <p className="text-xs text-muted-foreground">your highest score</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/quizzes">
              <Button className="w-full">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Quizzes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Your last 5 quiz attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSubmissions ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No submissions yet. Take your first quiz to get started!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => {
                    const percentage = Math.round(
                      (submission.score / submission.totalQuestions) * 100
                    );
                    return (
                      <TableRow
                        key={submission.id}
                        className="cursor-pointer"
                        onClick={() => {
                          window.location.href = `/dashboard/results/${submission.id}`;
                        }}
                      >
                        <TableCell className="font-medium">
                          {submission.quiz?.title || 'Unknown Quiz'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              percentage >= 70
                                ? 'default'
                                : percentage >= 50
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {submission.score}/{submission.totalQuestions} ({percentage}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {submission.submittedAt
                            ? formatDistanceToNow(new Date(submission.submittedAt), {
                                addSuffix: true,
                              })
                            : 'In progress'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
