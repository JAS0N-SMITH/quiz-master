'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { QuizTimer } from '@/components/quiz/QuizTimer';
import { QuestionItem } from '@/components/quiz/QuestionItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2 } from 'lucide-react';
import type { Submission, Question } from '@/types';
import { toast } from 'sonner';

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post<Submission>('/submissions/start', { quizId });
    },
    onSuccess: (data) => {
      setSubmission(data);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start quiz');
      router.push('/dashboard/quizzes');
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const answerArray = Object.entries(answers).map(([questionId, selectedOption]) => ({
        questionId,
        selectedOption,
      }));

      return apiClient.post<Submission>(`/submissions/${submissionId}/submit`, {
        answers: answerArray,
      });
    },
    onSuccess: (data) => {
      toast.success('Quiz submitted successfully!');
      router.push(`/dashboard/results/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit quiz');
      setIsSubmitting(false);
    },
  });

  useEffect(() => {
    if (quizId && !submission) {
      startMutation.mutate();
    }
  }, [quizId]);

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    if (submission && !submission.submittedAt) {
      setIsSubmitting(true);
      submitMutation.mutate(submission.id);
    }
  };

  const handleTimerExpire = () => {
    if (submission && !submission.submittedAt) {
      toast.warning('Time is up! Submitting your quiz...');
      handleSubmit();
    }
  };

  if (startMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!submission || !submission.quiz) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive">
          <AlertDescription>Failed to load quiz. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const quiz = submission.quiz;
  const questions = quiz.questions || [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-muted-foreground mt-2">{quiz.description}</p>
          )}
        </div>
        <QuizTimer
          timeLimit={quiz.timeLimit}
          onExpire={handleTimerExpire}
          startedAt={submission.startedAt}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <p className="text-sm text-muted-foreground">
            {questions.length} questions • {Object.keys(answers).length} answered
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question, index) => (
            <QuestionItem
              key={question.id}
              question={question}
              questionNumber={index + 1}
              selectedOption={answers[question.id]}
              onSelect={handleSelectAnswer}
              disabled={isSubmitting || !!submission.submittedAt}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between sticky bottom-4 bg-background p-4 rounded-lg border shadow-lg">
        <div className="text-sm text-muted-foreground">
          {allAnswered ? (
            <span className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              All questions answered
            </span>
          ) : (
            <span>
              {questions.length - Object.keys(answers).length} question(s) remaining
            </span>
          )}
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!allAnswered || isSubmitting || !!submission.submittedAt}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Quiz'
          )}
        </Button>
      </div>
    </div>
  );
}
