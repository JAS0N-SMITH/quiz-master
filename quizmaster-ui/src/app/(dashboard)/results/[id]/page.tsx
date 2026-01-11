'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import type { Submission } from '@/types';
import { formatDistanceToNow } from 'date-fns';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const { data: submission, isLoading, error } = useQuery<Submission>({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      return apiClient.get<Submission>(`/submissions/${submissionId}`);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load results. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quiz = submission.quiz;
  const answers = submission.answers || [];
  const questions = quiz?.questions || [];
  const score = submission.score;
  const total = submission.totalQuestions;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  const timeTaken = submission.submittedAt && submission.startedAt
    ? Math.round((new Date(submission.submittedAt).getTime() - new Date(submission.startedAt).getTime()) / 1000 / 60)
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quiz Results</h1>
          <p className="text-muted-foreground mt-2">{quiz?.title}</p>
        </div>
        <Link href="/dashboard/quizzes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
      </div>

      {/* Score Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle>Your Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-5xl font-bold mb-2">
                {score} / {total}
              </div>
              <div className="text-2xl font-semibold text-muted-foreground">
                {percentage}%
              </div>
            </div>
            <div className="text-right space-y-2">
              {timeTaken !== null && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{timeTaken} minutes</span>
                </div>
              )}
              {submission.submittedAt && (
                <div className="text-sm text-muted-foreground">
                  Submitted {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions Review */}
      <Card>
        <CardHeader>
          <CardTitle>Question Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question, index) => {
            const answer = answers.find((a) => a.questionId === question.id);
            const isCorrect = answer?.isCorrect ?? false;
            const selectedOption = answer?.selectedOption ?? -1;
            const correctOption = question.correctOption ?? -1;

            return (
              <Card key={question.id} className={isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">Question {index + 1}</h3>
                          {isCorrect ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Incorrect
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{question.text}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          Your Answer:
                        </p>
                        <div className={`p-2 rounded ${isCorrect ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                          {selectedOption >= 0 && question.options[selectedOption]}
                        </div>
                      </div>

                      {!isCorrect && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Correct Answer:
                          </p>
                          <div className="p-2 rounded bg-green-100 dark:bg-green-900">
                            {correctOption >= 0 && question.options[correctOption]}
                          </div>
                        </div>
                      )}

                      {question.explanation && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Explanation:
                          </p>
                          <p className="text-sm p-2 rounded bg-muted">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-center">
        <Link href="/dashboard/quizzes">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quizzes
          </Button>
        </Link>
        {quiz && (
          <Link href={`/dashboard/quizzes/${quiz.id}/take`}>
            <Button>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
