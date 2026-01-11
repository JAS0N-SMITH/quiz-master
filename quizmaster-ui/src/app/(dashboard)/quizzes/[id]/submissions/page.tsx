'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import type { Submission, User } from '@/types';

interface SubmissionWithUser extends Submission {
  user: User;
}

export default function QuizSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const { user } = useAuthStore();

  const { data: submissions, isLoading, error } = useQuery<SubmissionWithUser[]>({
    queryKey: ['quiz-submissions', quizId],
    queryFn: async () => {
      return apiClient.get<SubmissionWithUser[]>(`/quizzes/${quizId}/submissions`);
    },
    enabled: !!quizId && (user?.role === 'TEACHER' || user?.role === 'ADMIN'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !submissions) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load submissions. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const averageScore =
    submissions.length > 0
      ? Math.round(
          (submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length / submissions[0].totalQuestions) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Submissions</h1>
          <p className="text-muted-foreground mt-2">View all student submissions for this quiz</p>
        </div>
        <Link href="/dashboard/quizzes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">students have taken this quiz</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <p className="text-xs text-muted-foreground">across all submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {submissions.filter((s) => s.submittedAt).length} / {submissions.length}
            </div>
            <p className="text-xs text-muted-foreground">submissions completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No submissions yet. Students will appear here once they take the quiz.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const percentage = Math.round((submission.score / submission.totalQuestions) * 100);
                  return (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/results/${submission.id}`)}
                    >
                      <TableCell className="font-medium">
                        {submission.user?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {submission.score} / {submission.totalQuestions}
                      </TableCell>
                      <TableCell>
                        <Badge variant={percentage >= 70 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                          {percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.submittedAt ? (
                          <Badge variant="default">Completed</Badge>
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {submission.submittedAt
                          ? formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })
                          : 'Not submitted'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/results/${submission.id}`);
                          }}
                        >
                          View Details
                        </Button>
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
  );
}
